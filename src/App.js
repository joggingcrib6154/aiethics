import React, { useState } from 'react';
import scenarioData from './data/scenarios.json';
import ScenarioScene from './components/ScenarioScene';
import { assignBadge } from './logic/assignBadge';
import { getMaskFragments } from './logic/getMaskFragments';
import MaskGrid from './components/MaskGrid';
import DoorScene from './components/DoorScene';


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
    <div className="w-screen h-screen bg-black text-white relative overflow-hidden">
      <h1 className="absolute top-4 left-1/2 transform -translate-x-1/2 text-3xl font-bold z-10">AI Ethics Game</h1>
  
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
        <MaskGrid choices={choices} />
      </div>
  
      {!gameOver ? (
        <ScenarioScene
        scenario={scenarioData[currentIndex]}
        onChoice={handleChoice}
      />      
      ) : (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <h2 className="text-2xl">Your Badge: {finalBadge}</h2>
        </div>
      )}
    </div>
  );  
}

export default App;
