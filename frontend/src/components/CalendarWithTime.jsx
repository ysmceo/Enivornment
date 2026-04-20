import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const CalendarWithTime = () => {
  const [date, setDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gradient-to-br from-indigo-100 via-sky-100 to-violet-100 dark:from-indigo-900 dark:via-sky-900 dark:to-violet-900 rounded-2xl shadow-lg p-6 flex flex-col items-center w-full border border-indigo-200 dark:border-indigo-700">
      <div className="text-xl font-bold mb-2 text-indigo-700 dark:text-indigo-200">Calendar</div>
      <Calendar value={date} onChange={setDate} className="rounded-lg border border-indigo-200 dark:border-indigo-700" />
      <div className="mt-6 text-3xl font-extrabold text-sky-600 dark:text-sky-300 tracking-widest">
        {currentTime.toLocaleTimeString()}
      </div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">{currentTime.toLocaleDateString()}</div>
    </div>
  );
};

export default CalendarWithTime;
