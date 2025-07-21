import React from 'react';
import './App.css';
import FallingText from './FallingText';

function App() {
  const words = [
    "Marketing", "SEO", "PPC", "Search", "Leads", "Creatives", 
    "Sales", "Strategy", "Conversions", "APP Development", 
    "Website Development", "Social Media", "Graphic Designing", 
    "Media House", "Podcast"
  ];
  
  return (
    <div className="App">
      <div className="animation-container">
        <FallingText
          text={words.join(' ')}
          highlightWords={words}
          highlightClass="highlighted"
          trigger="hover"
          backgroundColor="transparent"
          wireframes={false}
          gravity={0.56}
          fontSize="2rem"
          mouseConstraintStiffness={0.9}
        />
      </div>
    </div>
  );
}

export default App;
