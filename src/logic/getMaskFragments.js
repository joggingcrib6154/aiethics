export function getMaskFragments(choices) {
    return choices.map((choiceIndex, i) => {
      const scenarioNum = i + 1;
      const letter = ['A', 'B', 'C'][choiceIndex];
      return `M${scenarioNum}${letter}`;
    });
  }
  