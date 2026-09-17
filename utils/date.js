const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

const addDays = (date, days) => {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
};

module.exports = { startOfDay, sameDay, addDays };
