
const BADGES = [
    'Catalyst', 'Phantom', 'Humanist', 'Architect',
    'The Drift', 'Dissenter', 'Strategist', 'Visionary'
  ];
  
  export function assignBadge(choices, scenarioData) {
    const badgeCount = {};
    BADGES.forEach(b => (badgeCount[b] = 0));
  
    choices.forEach((choiceIndex, i) => {
      const scenario = scenarioData[i];
      const badge = scenario.choices[choiceIndex].badge;
      if (badge) badgeCount[badge]++;
    });
  
    return Object.entries(badgeCount).sort((a, b) => b[1] - a[1])[0][0];
  }
  
  export function getMaskFragments(choices) {
    return choices.map((choiceIndex, i) => {
      const scenarioNum = i + 1;
      const letter = ['A', 'B', 'C'][choiceIndex];
      return `M${scenarioNum}${letter}`;
    });
  }