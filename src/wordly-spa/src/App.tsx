import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import LetterCells from './LetterCells';
import axios from 'axios';

interface GuessedWords {
  guessedPositions: number[];
  guessedLetters: number[];
  word: string;
}

function App() {
  const [guessedWords, setGuessedWords] = useState<GuessedWords[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [message, setMessage] = useState('');

  const currentWordRef = useRef(currentWord);

  useEffect(() => {
    currentWordRef.current = currentWord;
  }, [currentWord]);

  useEffect(() => {
    if (guessedWords[guessedWords.length - 1]?.guessedPositions.length == 5) {
      sessionStorage.removeItem('gameId');
      setMessage('Победа');
  
      setTimeout(() => {
        setGuessedWords([]);
        setMessage('');
      }, 3000);
    }

    if (guessedWords.length == 6 && guessedWords.at(5)?.guessedPositions.length != 5) {
      sessionStorage.removeItem('gameId');
      setMessage('Не удалось разгадать слово!');

      setTimeout(() => {
        setGuessedWords([]);
      }, 3000);
    }
  }, [guessedWords]);

  useEffect(() => {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      setMessage('');
      if (e.key == 'Backspace') {
        setCurrentWord((prev) => prev.slice(0, -1));
      } else if (e.key.length == 1 && !Number(e.key)) {
        setCurrentWord((prev) => {
          return prev.length < 5 ? prev + e.key : prev;
        });
      } else if (e.key == 'Enter') {
        if (currentWordRef.current.length < 5) {
          setMessage('В слове должно быть 5 букв.');
        } else {
          verifyAnswer();
        }
      }
    });
  }, []);

  async function verifyAnswer() {
    const gameId = sessionStorage.getItem('gameId');

    await axios
      .get('https://17wtmr4hz0.execute-api.us-west-2.amazonaws.com/prod', {
        params: { word: currentWordRef.current, ...(gameId ? { gameId: gameId } : {}) },
      })
      .then(function (response) {
        if (!sessionStorage.getItem('gameId')) {
          sessionStorage.setItem('gameId', response.data.gameId || '');
        }

        if (response.data.error) {
          setMessage('Введенное слово не найдено.');
        } else {
          setGuessedWords((prev) =>
            prev.concat({
              guessedPositions: response.data.guessedPositions,
              guessedLetters: response.data.guessedLetters,
              word: currentWordRef.current,
            })
          );

          setCurrentWord('');
        }
      });
  }

  function printWord(index: number) {
    if (!guessedWords.at(index)) {
      if (guessedWords.length == index) {
        return currentWord;
      } else {
        return '';
      }
    } else {
      return guessedWords.at(index)?.word;
    }
  }

  return (
    <div className="Main">
      <div className="Message">{message}</div>
      {Array.from({ length: 6 }, (_, index) => (
        <LetterCells
          key={index}
          word={printWord(index)}
          greenPositions={guessedWords.at(index)?.guessedPositions}
          yellowPositions={guessedWords.at(index)?.guessedLetters}
        />
      ))}
    </div>
  );
}

export default App;
