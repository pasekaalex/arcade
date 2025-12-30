import { useState } from 'react'
import './Intro.css'

export default function Intro({ onEnter }) {
  const [aboutOpen, setAboutOpen] = useState(false)

  return (
    <div className="intro-container">
      <div className="intro-content">
        <h1 className="name-title">Alex Paseka</h1>
        
        <div className="about-section">
          <button 
            className="about-button"
            onClick={() => setAboutOpen(!aboutOpen)}
          >
            About {aboutOpen ? '▼' : '▶'}
          </button>
          
          {aboutOpen && (
            <div className="about-dropdown">
              <div className="dropdown-item">
                <strong>Education:</strong>
                <p>Bachelors of Science in Computer Science</p>
                <p>CUNY Brooklyn College</p>
              </div>
            </div>
          )}
        </div>

        <button 
          className="enter-button"
          onClick={onEnter}
        >
          React Arcade →
        </button>
      </div>
    </div>
  )
}

