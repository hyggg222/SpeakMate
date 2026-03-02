"use client";

const WEEKS = 24;
const DAYS_PER_WEEK = 7;

function generateData() {
  // Use deterministic data closely resembling a realistic heatmap.
  const data: number[][] = [];
  const pattern = [
    [0, 1, 2, 3, 4, 1, 0, 2, 3, 0, 1, 4, 2, 3, 0, 1, 2, 4, 3, 1, 0, 2, 3, 1],
    [1, 0, 3, 2, 4, 0, 1, 2, 3, 1, 4, 0, 2, 1, 3, 2, 4, 0, 1, 3, 2, 1, 4, 0],
    [2, 3, 0, 1, 4, 2, 3, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1],
    [0, 1, 1, 2, 3, 0, 1, 2, 4, 3, 1, 0, 2, 3, 1, 0, 1, 2, 3, 4, 1, 0, 2, 3],
    [3, 2, 4, 0, 1, 3, 2, 1, 4, 0, 1, 0, 3, 2, 4, 0, 1, 2, 3, 1, 4, 0, 2, 1],
    [1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 0, 1, 4, 2, 3, 0, 1, 2, 3, 4, 0],
    [1, 0, 2, 3, 0, 1, 4, 2, 3, 0, 1, 2, 4, 3, 1, 0, 2, 3, 1, 0, 1, 2, 3, 4],
  ];

  for (let d = 0; d < DAYS_PER_WEEK; d++) {
    const row = pattern[d];
    data.push(row);
  }
  return data;
}

const activityRows = generateData();
const MONTHS = ["Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
const DAY_LABELS = ["Thu", "Sat", "Tue"];
const SHOW_DAYS = [2, 4, 6];

const LEVEL_COLORS = [
  "#e9f0ef",  // 0
  "#a7d9d3",  // 1
  "#6ec4bb",  // 2
  "#3aada2",  // 3
  "#1a7a74",  // 4
];

export default function ActivityCalendar() {
  const weeksPerMonth = 4;

  return (
    <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: "var(--card)" }}>
      <h3 className="text-[15px] font-bold mb-3" style={{ color: "var(--foreground)" }}>
        Lịch hoạt động
      </h3>

      <div className="overflow-x-auto">
        <div className="flex flex-col gap-1" style={{ minWidth: "fit-content" }}>

          {/* Months Header */}
          <div className="flex" style={{ paddingLeft: 24 }}>
            {MONTHS.map((month) => (
              <div key={month} className="text-[10px] text-center" style={{ width: weeksPerMonth * 12.5, color: "var(--muted-foreground)" }}>
                {month}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          {DAY_LABELS.map((dayLabel, rowIndex) => (
            <div key={dayLabel} className="flex items-center gap-1.5">
              <span className="text-[9px] w-5 text-right" style={{ color: "var(--muted-foreground)" }}>
                {dayLabel}
              </span>
              <div className="flex gap-1" style={{ width: WEEKS * 12.5 }}>
                {activityRows[rowIndex].map((val, colIndex) => (
                  <div
                    key={colIndex}
                    className="rounded-[2px]"
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: LEVEL_COLORS[val],
                    }}
                  />
                ))}
              </div>
            </div>
          ))}

        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 justify-end">
          <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Đóng đá</span>
          <div className="flex items-center gap-1.5">
            {LEVEL_COLORS.map((color, i) => (
              <div
                key={i}
                className="rounded-[2px]"
                style={{ width: 10, height: 10, backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Nhiều</span>
        </div>
      </div>
    </div>
  );
}
