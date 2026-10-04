export const DEFAULT_WEEK_SCHEDULE = { mon: 0, tue: 2, wed: 0, thu: 2, fri: 1, sat: 0, sun: 0 };

export const normalizeWeeklySchedule = (schedule) => {
  if (!schedule) {
    return {
      use_two_weeks: false,
      week1: { ...DEFAULT_WEEK_SCHEDULE },
      week2: { ...DEFAULT_WEEK_SCHEDULE }
    };
  }

  if (typeof schedule === 'object' && ('week1' in schedule || 'use_two_weeks' in schedule)) {
    return {
      use_two_weeks: Boolean(schedule.use_two_weeks),
      week1: schedule.week1 ? { ...DEFAULT_WEEK_SCHEDULE, ...schedule.week1 } : { ...DEFAULT_WEEK_SCHEDULE },
      week2: schedule.week2 ? { ...DEFAULT_WEEK_SCHEDULE, ...schedule.week2 } : { ...DEFAULT_WEEK_SCHEDULE }
    };
  }

  // Legacy schedule format { mon: X, tue: Y, ... }
  return {
    use_two_weeks: false,
    week1: { ...DEFAULT_WEEK_SCHEDULE, ...schedule },
    week2: { ...DEFAULT_WEEK_SCHEDULE, ...schedule }
  };
};

export const getWeekDetailsForDate = (dateObj, startDateObj, normSched) => {
  const schedule = normalizeWeeklySchedule(normSched);
  if (!schedule.use_two_weeks) {
    return { weekObj: schedule.week1, weekLabel: 'Semana 1', isWeek2: false };
  }

  const startDayOfWeek = startDateObj.getDay();
  const startMonday = new Date(startDateObj);
  const diffToMon = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek;
  startMonday.setDate(startMonday.getDate() + diffToMon);
  startMonday.setHours(0, 0, 0, 0);

  const currentMonday = new Date(dateObj);
  const curDayOfWeek = currentMonday.getDay();
  const diffToCurMon = curDayOfWeek === 0 ? -6 : 1 - curDayOfWeek;
  currentMonday.setDate(currentMonday.getDate() + diffToCurMon);
  currentMonday.setHours(0, 0, 0, 0);

  const diffWeeks = Math.round((currentMonday.getTime() - startMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const isWeek2 = Math.abs(diffWeeks) % 2 === 1;
  return {
    weekObj: isWeek2 ? schedule.week2 : schedule.week1,
    weekLabel: isWeek2 ? 'Semana 2' : 'Semana 1',
    isWeek2
  };
};

export const getWeekScheduleForDate = (dateObj, startDateObj, normSched) => {
  return getWeekDetailsForDate(dateObj, startDateObj, normSched).weekObj;
};
