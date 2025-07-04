import React, { useState } from 'react';
import scenarioData from './data/scenarios.json';
import ScenarioScreen from './components/ScenarioScreen';
import { assignBadge } from './logic/assignBadge';
import { getMaskFragments } from './logic/getMaskFragments';
import MaskGrid from './components/MaskGrid';

function App() {
  const [choices, setChoices] = useState([]);

  const currentIndex = choices.length;
  const gameOver = currentIndex >= scenarioData.length;
  const finalBadge = gameOver ? assignBadge(choices, scenarioData) : null;

  const handleChoice = (choiceIndex) => {
    if (!gameOver) {
      setChoices([...choices, choiceIndex]);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative space-y-8">
      <h1 className="text-3xl font-bold">AI Ethics Game</h1>

      <MaskGrid choices={choices} />

      {!gameOver ? (
        <ScenarioScreen
          scenario={scenarioData[currentIndex]}
          onChoice={handleChoice}
        />
      ) : (
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-yellow-400">You’ve Completed the Journey</h2>
          <p className="text-xl">Your Emblem:</p>
          <p className="text-2xl font-semibold text-white bg-slate-800 px-4 py-2 inline-block rounded-xl">
            {finalBadge}
          </p>
          <p className="text-md text-gray-400">(And here’s the full mask you built)</p>
        </div>
      )}
    </div>
  );
}

export default App;
