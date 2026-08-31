import { Chess } from 'chess.js';

// NOTE: One-off exploratory script, kept for reference only. It was used to derive
// final FENs for trap lines before src/data/traps.js existed; its hardcoded move
// lists have since diverged from the checked-in data (9 entries here vs 14 in
// src/data/traps.js) and it neither reads from nor writes to any project file.
// The maintained validity check is validate-traps.js (`npm run validate:traps`),
// which is also mirrored by src/data/traps.test.js under vitest.

// Test trap lines and extract their final positions
const traps = {
  'fried-liver': {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Bxc6+']
  },
  'legal-trap': {
    moves: ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1', 'Bxf7+', 'Ke7', 'Nd5#']
  },
  'budapest-white': {
    moves: ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'e4', 'Qh4', 'Nf3', 'Qh3', 'Be2', 'Nc6', 'Nc3', 'Bg4', 'O-O', 'O-O-O']
  },
  'elephant-trap': {
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Be2', 'h6', 'Bh4', 'Ne4']
  },
  'ponziani': {
    moves: ['e4', 'e5', 'c3', 'd5', 'exd5', 'Qxd5', 'd4', 'exd4', 'cxd4', 'Qxd4+', 'Nc3', 'Qd8', 'Bf4']
  },
  'stafford': {
    moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3', 'Nxe4', 'd4', 'Qe7', 'Be2', 'Nf6', 'O-O', 'c6']
  },
  'traxler': {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'Bc5', 'Nxf7', 'Bxf2+', 'Kxf2', 'Nxe4+', 'Kf3', 'Qh4']
  },
  'budapest-black': {
    moves: ['d4', 'd5', 'c4', 'e5', 'cxd5', 'Qxd5', 'Nc3', 'Qa5', 'Bg5', 'exd4', 'Bxf6', 'Bxf6', 'Nxd4', 'Bxb2', 'Nf3']
  },
  'smothered-mate': {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'h6', 'Nh3', 'Na5', 'Bb5+', 'c6', 'Ba4']
  }
};

for (const [name, data] of Object.entries(traps)) {
  const chess = new Chess();
  let valid = true;
  
  try {
    for (const move of data.moves) {
      if (!chess.move(move, { sloppy: true })) {
        valid = false;
        console.log(`${name}: FAILED at move "${move}"`);
        console.log(`  FEN: ${chess.fen()}`);
        console.log(`  Legal: ${chess.moves({ verbose: true }).map(m => m.san).join(', ')}`);
        break;
      }
    }
    
    if (valid) {
      console.log(`${name}: ✅ ${data.moves.length} moves valid`);
      console.log(`  FEN: ${chess.fen()}`);
    }
  } catch (e) {
    console.log(`${name}: ERROR - ${e.message}`);
  }
}
