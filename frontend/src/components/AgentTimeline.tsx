'use client';

const AGENTS = [
  { num: '01', name: 'Input Parser' },
  { num: '02', name: 'Schema Extractor' },
  { num: '03', name: 'Endpoint Mapper' },
  { num: '04', name: 'Auth Analyzer' },
  { num: '05', name: 'MCP Translator' },
  { num: '06', name: 'Code Generator' },
  { num: '07', name: 'Validator' },
  { num: '08', name: 'Docs Generator' },
];

export function AgentTimeline({
  activeIndex = -1,
  completed = [],
  compact = false,
}: {
  activeIndex?: number;
  completed?: number[];
  compact?: boolean;
}) {
  const dotR = compact ? 5 : 7;
  const lineY = compact ? 18 : 28;
  const labelY = compact ? 36 : 56;
  const numY = compact ? 12 : 18;
  const svgH = compact ? 56 : 92;

  const lastDone = activeIndex >= 0 ? activeIndex : Math.max(...completed, -1);
  const endX = lastDone >= 0 ? 40 + (lastDone / (AGENTS.length - 1)) * (760 - 40) : 40;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }} className="scroll-thin">
      <svg
        viewBox={`0 0 800 ${svgH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ minWidth: 600, height: svgH, display: 'block', width: '100%' }}
      >
        {/* Dotted spine */}
        <line
          x1="40" y1={lineY} x2="760" y2={lineY}
          stroke="var(--rule-strong)" strokeWidth="1" strokeDasharray="1.2 4"
        />

        {/* Solid progress line */}
        {lastDone >= 0 && (
          <line
            x1="40" y1={lineY} x2={endX} y2={lineY}
            stroke="var(--accent)" strokeWidth="1.5"
          />
        )}

        {AGENTS.map((agent, i) => {
          const x = 40 + (i / (AGENTS.length - 1)) * (760 - 40);
          const done = completed.includes(i);
          const active = i === activeIndex;
          const idle = !done && !active;
          const fill = done || active ? 'var(--accent)' : 'var(--paper)';
          const stroke = done || active ? 'var(--accent)' : 'var(--rule-strong)';

          return (
            <g key={i}>
              {/* Animated halo for active */}
              {active && (
                <circle cx={x} cy={lineY} r={dotR + 6} fill="var(--accent)" opacity="0.18">
                  <animate attributeName="r" values={`${dotR + 4};${dotR + 9};${dotR + 4}`} dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.28;0.05;0.28" dur="1.4s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={x} cy={lineY} r={dotR}
                fill={fill} stroke={stroke} strokeWidth={idle ? 1 : 1.5}
              />
              {/* Checkmark for done */}
              {done && (
                <path
                  d={`M${x - 2.5} ${lineY} l 2 2 l 4 -4`}
                  stroke="var(--paper)" strokeWidth="1.5" fill="none"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              )}
              {/* Number above */}
              <text
                x={x} y={numY}
                textAnchor="middle"
                fontFamily="var(--mono)" fontSize={compact ? 8.5 : 9.5}
                letterSpacing="0.1em"
                fill={done || active ? 'var(--accent)' : 'var(--ink-mute)'}
              >
                {agent.num}
              </text>
              {/* Name below */}
              {!compact && (
                <text
                  x={x} y={labelY}
                  textAnchor="middle"
                  fontFamily="var(--sans)" fontSize="11"
                  fontWeight={done || active ? '600' : '500'}
                  fill={done || active ? 'var(--ink)' : 'var(--ink-3)'}
                >
                  {agent.name}
                </text>
              )}
              {!compact && active && (
                <text
                  x={x} y={labelY + 16}
                  textAnchor="middle"
                  fontFamily="var(--mono)" fontSize="9.5" letterSpacing="0.08em"
                  fill="var(--accent)"
                >
                  RUNNING
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
