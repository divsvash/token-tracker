import React from 'react';

interface ContributionGraphProps {
  data: Array<[string, number]>;
}

const ContributionGraph: React.FC<ContributionGraphProps> = ({ data }) => {
  const getIntensity = (value: number, max: number): number => {
    if (value === 0) return 0;
    return Math.ceil((value / max) * 4);
  };

  const getColor = (intensity: number): string => {
    const colors = [
      '#111111', // level 0 - black
      '#1e3a5f', // level 1 - dark blue
      '#2d5a87', // level 2 - medium blue
      '#3c7ab4', // level 3 - light blue
      '#58a6ff', // level 4 - bright blue
    ];
    return colors[intensity];
  };

  const maxTokens = Math.max(...data.map(([, tokens]) => tokens), 1);

  // Group by week (7 days)
  const weeks: Array<Array<[string, number]>> = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  return (
    <div className="graph-container">
      <div className="graph-title">Usage Contribution (Last 12 Weeks)</div>
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {week.map(([date, tokens]) => {
              const intensity = getIntensity(tokens, maxTokens);
              const color = getColor(intensity);
              return (
                <div
                  key={date}
                  title={`${date}: ${tokens.toLocaleString()} tokens`}
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: color,
                    borderRadius: '2px',
                    border: '1px solid #333333',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#ffffff' }}>
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: getColor(level),
              borderRadius: '2px',
              border: '1px solid #333333',
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

export default ContributionGraph;
