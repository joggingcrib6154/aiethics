import React, { useState } from 'react';
import scenarioData from './data/scenarios.json';
import ScenarioScene from './components/ScenarioScene';
import IntroductionScreen from './components/IntroductionScreen';

import { getMaskFragments } from './logic/getMaskFragments';
import MaskGrid from './components/MaskGrid';
import DoorScene from './components/DoorScene';
import Playground from './components/Playground';
import EndScreen from './components/EndScreen';


function App() {

  /*return <Playground />;*/

  // Assigns a badge based on tag counts in user choices
  const assignBadge = (choices) => {
    const tagCounts = { red: 0, yellow: 0, green: 0 };
    choices.forEach(choice => {
      if (choice && choice.tag && tagCounts.hasOwnProperty(choice.tag)) {
        tagCounts[choice.tag]++;
      }
    });

    const { red, yellow, green } = tagCounts;
    const total = red + yellow + green || 1;
    const greenPct = green / total;
    const yellowPct = yellow / total;
    const redPct = red / total;

    // Determine archetype by distribution
    if (greenPct >= 0.7) return "Humanist";
    if (greenPct >= 0.5 && yellowPct >= 0.25) return "Strategist";
    if (greenPct >= 0.4 && redPct >= 0.4) return "Visionary";
    if (yellowPct >= 0.5 && greenPct >= 0.3) return "Architect";
    if (Math.abs(redPct - yellowPct) < 0.1 && Math.abs(greenPct - redPct) < 0.1) return "Catalyst";
    if (redPct >= 0.6 && yellowPct >= 0.2) return "Dissenter";
    if (redPct > 0.3 && greenPct > 0.3 && yellowPct < 0.3) return "The Drift";
    if (redPct >= 0.7) return "Maverick";
    return "Phantom";
  };

  const [choices, setChoices] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);

  const currentIndex = choices.length;
  const gameOver = currentIndex >= scenarioData.length;
  const finalBadge = gameOver ? assignBadge(choices) : null;

  const handleChoice = (choiceIndex) => {
    if (!gameOver) {
      const scenario = scenarioData[currentIndex];
      const choiceObj = {
        scenarioTitle: scenario.title,
        answerText: scenario.choices[choiceIndex].text,
        tag: scenario.choices[choiceIndex].tag,
        index: choiceIndex,
      };
      setChoices([...choices, choiceObj]);
    }
  };

  return (
    <div className="fixed inset-0 text-white overflow-hidden" style={{ backgroundColor: 'rgb(128, 102, 179)' }}>
  
      {!gameStarted ? (
        <IntroductionScreen onStart={() => setGameStarted(true)} />
      ) : (
        <>
          <div className="absolute top-4 right-4 z-10">
            <MaskGrid choices={choices} />
          </div>
  
          {!gameOver ? (
            <ScenarioScene
              scenario={scenarioData[currentIndex]}
              onChoice={handleChoice}
              choices={choices}
              gameStarted={gameStarted}
              setGameStarted={setGameStarted}
              onGameStart={() => setGameStarted(true)}
            />      
          ) : (
            <EndScreen choices={choices} archetype={finalBadge} />
          )}
        </>
      )}
    </div>
  ); 
}

export default App;
