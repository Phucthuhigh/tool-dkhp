import { isLT, isTH, isChildOf, matchKhoaFilter } from './link.js'
import { isConflict } from './tiet.js'
import { getProfReviewData, getProfScore, normalizeGV } from './profReview.js'

const DEFAULT_BLIND_PROF_SCORE = 3.5

function scoreOption(classes, freeDaySet, profData, profWeight, freeDayWeight) {
  let profScore = 0
  let profCount = 0
  let freeDayScore = 0

  for (const c of classes) {
    if (c.tenGV) {
      const { score } = getProfScore(c.tenGV, profData)
      profScore += score
      profCount++
    }

    if (c.thu != null && freeDaySet.size > 0) {
      if (freeDaySet.has(c.thu)) {
        freeDayScore -= 50
      } else {
        freeDayScore += 10
      }
    }
  }

  const avgProf = profCount > 0 ? (profScore / profCount) * 20 : 50
  const normalizedFreeDay = freeDaySet.size > 0 ? Math.max(0, Math.min(100, 50 + freeDayScore)) : 50

  return (avgProf * profWeight + normalizedFreeDay * freeDayWeight) / 100
}

function computeBreakdown(classes, freeDaySet, profData) {
  const scheduledClasses = classes.filter((c) => c.thu != null)
  const daysUsed = new Set(scheduledClasses.map((c) => c.thu))
  const freeDaysAchieved = [...freeDaySet].filter((d) => !daysUsed.has(d))

  let profScoreSum = 0
  let profCount = 0
  const gvScores = []

  for (const c of classes) {
    if (c.tenGV) {
      const { score } = getProfScore(c.tenGV, profData)
      profScoreSum += score
      profCount++
      gvScores.push({ maLop: c.maLop, tenGV: c.tenGV, score })
    }
  }

  return {
    avgProfScore: profCount > 0 ? profScoreSum / profCount : null,
    freeDaysRequested: [...freeDaySet],
    freeDaysAchieved,
    freeDaySuccess: freeDaySet.size > 0 ? freeDaysAchieved.length / freeDaySet.size : 1,
    daysUsed: [...daysUsed].sort((a, b) => a - b),
    totalCredits: classes.reduce((s, c) => s + (Number(c.soTC) || 0), 0),
    classCount: classes.length,
    gvScores,
  }
}

export function autoSchedule({
  selectedCourses,
  freeDays = [],
  selectedKhoa = '',
  allClasses,
  profData,
  maxResults = 3,
  profWeight = 70,
  freeDayWeight = 30,
  shuffle = false,
}) {
  if (!selectedCourses || selectedCourses.length === 0 || !allClasses) return []

  const byCode = new Map()
  for (const c of allClasses) byCode.set(c.maLop, c)
  const freeDaySet = new Set(freeDays)

  const courseMap = new Map()
  for (const c of allClasses) {
    if (!selectedCourses.includes(c.maMH)) continue
    if (selectedKhoa && !matchKhoaFilter(c, selectedKhoa)) continue

    if (!courseMap.has(c.maMH)) {
      courseMap.set(c.maMH, { lt: [], th: [], other: [] })
    }
    const bucket = courseMap.get(c.maMH)
    if (isLT(c)) {
      bucket.lt.push(c)
    } else if (isTH(c)) {
      bucket.th.push(c)
    } else {
      bucket.other.push(c)
    }
  }

  const slots = []

  for (const maMH of selectedCourses) {
    const bucket = courseMap.get(maMH)
    if (!bucket) continue

    const options = []
    const { lt: ltList, th: allTHList, other: otherList } = bucket

    if (ltList.length > 0) {
      if (allTHList.length > 0) {
        for (const lt of ltList) {
          let matchingTHList = allTHList.filter((th) => isChildOf(th, lt))
          if (matchingTHList.length === 0) {
            matchingTHList = allTHList
          }

          for (const th of matchingTHList) {
            const baseScore = scoreOption([lt, th], freeDaySet, profData, profWeight, freeDayWeight)
            const score = shuffle ? baseScore + (Math.random() - 0.5) * 20 : baseScore
            options.push({
              classes: [lt, th, ...otherList],
              score,
            })
          }
        }
      } else {
        for (const lt of ltList) {
          const baseScore = scoreOption([lt], freeDaySet, profData, profWeight, freeDayWeight)
          const score = shuffle ? baseScore + (Math.random() - 0.5) * 20 : baseScore
          options.push({
            classes: [lt, ...otherList],
            score,
          })
        }
      }
    } else if (allTHList.length > 0) {
      for (const th of allTHList) {
        const baseScore = scoreOption([th], freeDaySet, profData, profWeight, freeDayWeight)
        const score = shuffle ? baseScore + (Math.random() - 0.5) * 20 : baseScore
        options.push({
          classes: [th, ...otherList],
          score,
        })
      }
    } else if (otherList.length > 0) {
      const baseScore = scoreOption(otherList, freeDaySet, profData, profWeight, freeDayWeight)
      const score = shuffle ? baseScore + (Math.random() - 0.5) * 20 : baseScore
      options.push({
        classes: [...otherList],
        score,
      })
    }

    if (options.length === 0) continue
    options.sort((a, b) => b.score - a.score)
    slots.push({ maMH, options })
  }

  if (slots.length === 0) return []

  const MAX_COMBINATIONS = 50000
  let combinationCount = 0
  const results = []

  function backtrack(slotIdx, chosen, totalScore) {
    if (combinationCount >= MAX_COMBINATIONS) return
    if (slotIdx === slots.length) {
      results.push({ classes: [...chosen], score: totalScore })
      combinationCount++
      return
    }

    const slot = slots[slotIdx]
    for (const option of slot.options) {
      if (combinationCount >= MAX_COMBINATIONS) return

      let conflict = false
      for (const c of option.classes) {
        if (c.thu == null) continue
        for (const prev of chosen) {
          if (isConflict(c, prev)) {
            conflict = true
            break
          }
        }
        if (conflict) break
      }
      if (conflict) continue

      for (const c of option.classes) chosen.push(c)
      backtrack(slotIdx + 1, chosen, totalScore + option.score)
      for (let i = 0; i < option.classes.length; i++) chosen.pop()
    }
  }

  backtrack(0, [], 0)

  if (results.length === 0) return []

  if (shuffle) {
    results.sort((a, b) => (b.score + (Math.random() - 0.5) * 10) - (a.score + (Math.random() - 0.5) * 10))
  } else {
    results.sort((a, b) => b.score - a.score)
  }

  return results.slice(0, maxResults).map((r, i) => {
    const breakdown = computeBreakdown(r.classes, freeDaySet, profData)
    return {
      rank: i + 1,
      classes: r.classes,
      classIds: r.classes.map((c) => c.id),
      score: r.score,
      breakdown,
    }
  })
}

export function autoScheduleEngine(selectedSubjectCodes, allClasses, options = {}) {
  const {
    studentCohort = '',
    preferredDaysOff = [],
    topK = 5,
    jitter = false,
  } = options

  if (!selectedSubjectCodes || selectedSubjectCodes.length === 0 || !allClasses || allClasses.length === 0) {
    return []
  }

  const validClasses = allClasses.filter((c) => matchKhoaFilter(c, studentCohort))
  const cleanedCodes = selectedSubjectCodes.filter(Boolean).map((code) => String(code).trim())

  const plans = autoSchedule({
    selectedCourses: cleanedCodes,
    freeDays: preferredDaysOff,
    selectedKhoa: studentCohort,
    allClasses: validClasses,
    profData: getProfReviewData,
    maxResults: topK,
    profWeight: 70,
    freeDayWeight: 30,
    shuffle: jitter,
  })

  return plans.map((plan, idx) => {
    const allClassesInPlan = plan.classes
    const profScoreSum = allClassesInPlan.reduce((sum, c) => {
      if (!c.tenGV) return sum
      const { score } = getProfScore(c.tenGV)
      return sum + score
    }, 0)

    const profRating = allClassesInPlan.filter((c) => c.tenGV).length
      ? Number((profScoreSum / allClassesInPlan.filter((c) => c.tenGV).length).toFixed(2))
      : DEFAULT_BLIND_PROF_SCORE

    const busyDays = new Set(allClassesInPlan.map((c) => c.thu).filter(Boolean))
    const achievedDaysOff = preferredDaysOff.filter((dayNum) => !busyDays.has(dayNum))

    const totalTC = allClassesInPlan.reduce((sum, c) => sum + (Number(c.soTC) || 0), 0)

    return {
      id: `auto-plan-${idx + 1}-${Date.now()}`,
      title: `Phương án TKB ${idx + 1}`,
      units: allClassesInPlan,
      classes: allClassesInPlan,
      totalTC,
      score: Number(plan.score.toFixed(1)),
      profRating,
      achievedDaysOff,
      busyDaysCount: busyDays.size,
    }
  })
}

export function getUniqueCourses(allClasses) {
  const map = new Map()
  for (const c of allClasses) {
    if (!c.maMH) continue
    if (!map.has(c.maMH)) {
      map.set(c.maMH, {
        maMH: c.maMH,
        tenMH: c.tenMH,
        ltTC: 0,
        thTC: 0,
        otherTC: 0,
        classCount: 0,
        hasLT: false,
        hasTH: false,
      })
    }
    const entry = map.get(c.maMH)
    entry.classCount++
    const tc = Number(c.soTC) || 0
    if (isLT(c)) {
      entry.hasLT = true
      if (!entry.ltTC) entry.ltTC = tc
    } else if (isTH(c)) {
      entry.hasTH = true
      if (!entry.thTC) entry.thTC = tc
    } else if (!entry.otherTC) {
      entry.otherTC = tc
    }
  }

  return [...map.values()].map((entry) => ({
    maMH: entry.maMH,
    tenMH: entry.tenMH,
    soTC: entry.ltTC + entry.thTC + entry.otherTC,
    classCount: entry.classCount,
    hasLT: entry.hasLT,
    hasTH: entry.hasTH,
  })).sort((a, b) => a.tenMH.localeCompare(b.tenMH, 'vi'))
}
