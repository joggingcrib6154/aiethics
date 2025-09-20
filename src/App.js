import React, { useState } from 'react';
import scenarioData from './data/scenarios.json';
import ScenarioScene from './components/ScenarioScene';
import { assignBadge } from './logic/assignBadge';
import { getMaskFragments } from './logic/getMaskFragments';
import MaskGrid from './components/MaskGrid';
import DoorScene from './components/DoorScene';
import Playground from './components/Playground';
import EndScreen from './components/EndScreen';


function App() {

  /*return <Playground />;*/

  
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
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
  
      <div className="absolute top-4 right-4 z-10">
        <MaskGrid choices={choices} />
      </div>
  
      {!gameOver ? (
        <ScenarioScene
        scenario={scenarioData[currentIndex]}
        onChoice={handleChoice}
        choices={choices}
      />      
      ) : (
        <EndScreen choices={choices} finalBadge={finalBadge} />
      )}
    </div>
  ); 
}

export default App;
