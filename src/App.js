import React, { useState, useEffect } from 'react';
import scenarioData from './data/scenarios.json';
import ScenarioScene from './components/ScenarioScene';
import IntroductionScreen from './components/IntroductionScreen';
import TimelineControls from './components/TimelineControls';

import { getMaskFragments } from './logic/getMaskFragments';
import MaskGrid from './components/MaskGrid';
import DoorScene from './components/DoorScene';
import Playground from './components/Playground';
import EndScreen from './components/EndScreen';


function App() {

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  // skipSlide=true suppresses the TransitionManager spring when advancing via door click
  const [skipSlide, setSkipSlide] = useState(false);

  const gameOver = currentIndex >= scenarioData.length && choices.length >= scenarioData.length;
  const finalBadge = gameOver ? assignBadge(choices) : null;

  const handleChoice = (choiceIndex) => {
    if (currentIndex < scenarioData.length) {
      const scenario = scenarioData[currentIndex];
      const choiceObj = {
        scenarioTitle: scenario.title,
        answerText: scenario.choices[choiceIndex].text,
        tag: scenario.choices[choiceIndex].tag,
        index: choiceIndex,
      };

      const newChoices = [...choices];
      newChoices[currentIndex] = choiceObj;
      const truncated = newChoices.slice(0, currentIndex + 1);

      // Door-click advance: suppress the slide — the 3D animation is the transition
      setSkipSlide(true);
      setChoices(truncated);
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleTimelineSelect = (index) => {
    setSkipSlide(false);
    if (index < currentIndex) {
      setDirection(-1);
    } else {
      setDirection(1);
    }
    setCurrentIndex(index);
  }

  const handleNavigate = (dir) => {
    const newIndex = currentIndex + dir;
    // Only go back if there's a previous scenario, or forward if the next one was already answered
    if (dir === -1 && newIndex >= 0) {
      setSkipSlide(false);
      setDirection(-1);
      setCurrentIndex(newIndex);
    } else if (dir === 1 && newIndex < choices.length) {
      // Allow jumping forward only into already-answered scenes
      setSkipSlide(false);
      setDirection(1);
      setCurrentIndex(newIndex);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, color: 'white', overflow: 'hidden', backgroundColor: 'rgb(128, 102, 179)' }}>

      {!gameStarted ? (
        <IntroductionScreen onStart={() => setGameStarted(true)} />
      ) : (
        <>
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
            <MaskGrid choices={choices} />
          </div>

          {!gameOver ? (
            <>
              <ScenarioScene
                scenario={scenarioData[currentIndex]}
                nextScenario={scenarioData[currentIndex + 1]}
                onChoice={handleChoice}
                choices={choices}
                direction={direction}
                onNavigate={handleNavigate}
                skipSlide={skipSlide}
              />
              <TimelineControls
                total={scenarioData.length}
                current={currentIndex}
                maxReached={choices.length}
                onSelect={handleTimelineSelect}
              />
            </>
          ) : (
            <EndScreen choices={choices} archetype={finalBadge} />
          )}
        </>
      )}
    </div>
  );
}

export default App;
