import React, { useState, useEffect } from 'react';
import './App.css';
import styled from 'styled-components';

interface Props {
  green: boolean;
  yellow: boolean;
}

const LetterCell = styled.div<Props>`
  background-color: ${(props) => {
    let finalColor: string;

    if (props.green) {
      finalColor = 'green';
    } else if (props.yellow) {
      finalColor = 'orange';
    } else {
      finalColor = 'bisque';
    }

    return finalColor;
  }};
  width: 70px;
  height: 70px;
  margin: 5px;
  text-align: center;
  line-height: 60px;
  color: white;
  font-size: 60px;
  text-shadow: 0 0 2px #000;
`;

function LetterCells(props: { word: any; greenPositions: any; yellowPositions: any }) {
  return (
    <div className="Cells">
      {Array.from({ length: 5 }, (_, index) => {
        return (
          <LetterCell
            key={index}
            green={props.greenPositions?.includes(index)}
            yellow={props.yellowPositions?.includes(index)}
          >
            {props.word?.at(index)}
          </LetterCell>
        );
      })}
    </div>
  );
}

export default LetterCells;
