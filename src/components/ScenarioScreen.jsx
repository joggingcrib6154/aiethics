import React from 'react';

export default function ScenarioScreen({ scenario, onChoice }) {
  return (
    <div className="p-6 max-w-2xl mx-auto text-white space-y-4">
      <h2 className="text-2xl font-bold">{scenario.title}</h2>
      <p className="text-lg">{scenario.description}</p>

      <div className="flex flex-col gap-4 mt-4">
        {scenario.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => onChoice(i)}
            className="bg-slate-800 hover:bg-slate-600 px-4 py-2 rounded"
          >
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}
