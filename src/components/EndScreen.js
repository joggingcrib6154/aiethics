import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import BackgroundShaders from './BackgroundShaders';
import MaskGrid, { downloadMaskGrid } from './MaskGrid';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import ShaderLabel from './ShaderLabel';

function EndScreen({ choices = [], archetype = '' }) {
  const maskGridRef = useRef(null);
  const enrichedChoices = choices.map((choice, i) => {
    if (typeof choice === 'number') {
      return {
        title: `Scenario ${i + 1}`,
        answer: ['Option A', 'Option B', 'Option C'][choice],
        tag: choice === 0 ? 'red' : choice === 1 ? 'yellow' : 'green',
      };
    }
    return choice;
  });

  // Analyze tags from choices
  const tagCounts = { red: 0, yellow: 0, green: 0 };
  enrichedChoices.forEach(choice => {
    if (choice && choice.tag && tagCounts.hasOwnProperty(choice.tag)) {
      tagCounts[choice.tag]++;
    }
  });

  let message = '';
  const { red, yellow, green } = tagCounts;
  const counts = [red, yellow, green];
  const maxCount = Math.max(...counts);
  const dominantTags = Object.keys(tagCounts).filter(tag => tagCounts[tag] === maxCount);
  // compute second max safely
  const secondMax = (() => {
    const sorted = [...counts].sort((a, b) => b - a);
    return sorted[1] || 0;
  })();
  const diff = maxCount - secondMax;

  const closeThreshold = 3;
  const moderateThresholdLow = 5;
  const moderateThresholdHigh = 9;
  const highCountThreshold = 15;

  if (dominantTags.length === 1) {
    const dominant = dominantTags[0];

    if (diff > moderateThresholdHigh) {
      // Strong statement for dominant tag ahead by more than 9
      if (dominant === 'green') {
        message = "You’re deeply committed to ethical AI. Your decisions reflect a profound dedication to fairness, respect, and the responsible use of technology.";
      } else if (dominant === 'yellow') {
        message = "You’re deeply committed to pragmatic AI ethics. Your adaptability and situational awareness guide your thoughtful and balanced choices.";
      } else if (dominant === 'red') {
        message = "You’re deeply engaged in risk-taking with AI. While this can spur innovation, it’s important to reflect on the ethical implications of your choices.";
      }
    } else if (diff >= moderateThresholdLow && diff <= moderateThresholdHigh) {
      // Moderate statement for dominant tag ahead by 5-9
      if (dominant === 'green') {
        message = "You show clear ethical awareness in your AI decisions, prioritizing fairness and responsibility.";
      } else if (dominant === 'yellow') {
        message = "You demonstrate pragmatic and adaptable thinking in your approach to AI ethics.";
      } else if (dominant === 'red') {
        message = "Your choices indicate a willingness to take risks with AI, though reflection on impact is valuable.";
      }
    } else if (diff <= closeThreshold) {
      // Counts close within 3
      message = "Your results reflect a complex and nuanced perspective on AI ethics, balancing multiple considerations and sometimes conflicting tendencies.";
    }

    // Additional emphasis if counts are high
    if (dominant === 'red' && red >= highCountThreshold) {
      message += " Your high risk-taking tendency suggests innovation but also a need for careful ethical reflection.";
    } else if (dominant === 'green' && green >= highCountThreshold) {
      message += " Your strong ethical leadership is a guiding force for responsible AI use.";
    } else if (dominant === 'yellow' && yellow >= highCountThreshold) {
      message += " Your adaptability and pragmatism help navigate the evolving landscape of AI ethics.";
    }
  } else {
    // Multiple tags tied for dominance or no clear dominant tag
    if (red >= highCountThreshold) {
      message = "Your results show significant risk-taking tendencies. Reflecting on the ethical impact of your choices will strengthen your approach.";
    } else if (green >= highCountThreshold) {
      message = "You exhibit strong ethical leadership in AI, guiding thoughtful and responsible innovation.";
    } else if (yellow >= highCountThreshold) {
      message = "Your adaptability and pragmatic approach help you navigate complex AI ethical challenges.";
    } else {
      message = "Your results show a mix of ethical and risk-taking tendencies. This balance can lead to thoughtful experimentation — just remember that consistency and self-awareness are key in navigating AI’s gray areas.";
    }
  }

  const handleDownloadMask = async () => {
    await downloadMaskGrid(enrichedChoices);
  };

  // Helper to get tag label and color type
  const getTagLabel = (tag) => {
    if (tag === 'green') return { label: 'Ethical', colorType: 'green' };
    if (tag === 'yellow') return { label: 'Neutral', colorType: 'blue' };
    if (tag === 'red') return { label: 'Unethical', colorType: 'red' };
    return { label: 'Unknown', colorType: 'green' };
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh' }}>
      <Canvas style={{ position: 'absolute', top: 0, left: 0 }}>
        <BackgroundShaders />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          width: '80%',
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 2,
          pointerEvents: 'auto'
        }}
      >
        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1.05 }}
          transition={{ duration: 0.9 }}
          style={{ fontSize: '3.5rem', color: 'white', textShadow: '0 0 24px rgba(0,255,200,0.25)' }}
        >
          {archetype}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          style={{ fontSize: '1.25rem', color: 'white', marginTop: '1rem', textShadow: '0 0 12px rgba(0,0,0,0.4)' }}
        >
          {message}
        </motion.p>

        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            maxHeight: '40vh',
            overflowY: 'auto',
            textAlign: 'left',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(6px)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {enrichedChoices.map((choice, index) => {
            const { label, colorType } = getTagLabel(choice.tag);
            // Get static color for the dot (dark colors)
            const dotColor = colorType === 'green' ? '#006600' : colorType === 'blue' ? '#000080' : '#800000';
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.05 }}
                style={{
                  color: 'white',
                  marginBottom: '1rem',
                  fontSize: '1rem',
                  lineHeight: '1.5',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                {choice.title || choice.scenarioTitle ? (
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {choice.title || choice.scenarioTitle}
                  </div>
                ) : null}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', justifyContent: 'flex-start' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <ShaderLabel 
                    text={label} 
                    colorType={colorType}
                    style={{ fontSize: '0.85rem', fontWeight: 600 }}
                  />
                </div>
                <ShaderLabel 
                  text={`Your choice: ${choice.answer || choice.text || choice.choice || choice.answerText || 'No choice recorded'}`}
                  colorType={colorType}
                  style={{ fontSize: '0.8rem', marginTop: '-0.2rem' }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 3, pointerEvents: 'auto' }} ref={maskGridRef}>
        <MaskGrid choices={enrichedChoices} />
      </div>

      <button
        onClick={handleDownloadMask}
        style={{
          position: 'absolute',
          bottom: '2rem',
          right: '2rem',
          padding: '0.6rem 1rem',
          background: 'linear-gradient(90deg,#06b6d4,#10b981)',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          zIndex: 4
        }}
      >
        Download Your Mask
      </button>
    </div>
  );
}

export default EndScreen;