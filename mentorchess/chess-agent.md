# MentorChess — Chess Knowledge Base

This file is referenced by the Claude Code agent (CLAUDE.md) to answer chess-related questions during development. Use this as a reference when implementing features, generating content, or debugging chess logic.

---

## Chess Fundamentals

### Piece Values (Centipawns)
| Piece | Symbol | Value |
|---|---|---|
| Pawn | ♟ | 100 |
| Knight | ♞ | 320 |
| Bishop | ♝ | 330 |
| Rook | ♜ | 500 |
| Queen | ♛ | 900 |
| King | ♚ | ∞ |

> Bishops are slightly more valuable than knights in open positions; knights are better in closed positions.

### Board Coordinates (Algebraic Notation)
- Files: `a–h` (left to right from White's perspective)
- Ranks: `1–8` (bottom to top from White's perspective)
- Starting squares: White pieces on ranks 1–2, Black pieces on ranks 7–8

---

## Opening Theory

### Key Principles
1. **Control the centre** — target e4, e5, d4, d5 squares
2. **Develop pieces early** — knights before bishops, minor pieces before major
3. **Castle early** — king safety is paramount
4. **Don't move the same piece twice** in the opening without good reason
5. **Connect your rooks** — after castling, clear the back rank

### Main Opening Families

#### 1. e4 Openings (Open Games)
| Opening | Moves | Character |
|---|---|---|
| Italian Game | 1.e4 e5 2.Nf3 Nc6 3.Bc4 | Positional, long-term pressure |
| Ruy López | 1.e4 e5 2.Nf3 Nc6 3.Bb5 | Strategic, endgame-oriented |
| Sicilian Defence | 1.e4 c5 | Asymmetric, double-edged |
| French Defence | 1.e4 e6 | Solid, counterattacking |
| Caro-Kann | 1.e4 c6 | Solid, structural |
| Pirc/Modern | 1.e4 d6/g6 | Hypermodern, flexible |
| Scandinavian | 1.e4 d5 | Immediate central challenge |

#### 2. d4 Openings (Closed Games)
| Opening | Moves | Character |
|---|---|---|
| Queen's Gambit | 1.d4 d5 2.c4 | Classical, positional |
| King's Indian Defence | 1.d4 Nf6 2.c4 g6 | Dynamic, counterattacking |
| Nimzo-Indian | 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 | Strategic, pin-based |
| Grünfeld | 1.d4 Nf6 2.c4 g6 3.Nc3 d5 | Hypermodern, central tension |
| Dutch Defence | 1.d4 f5 | Aggressive, unbalanced |
| London System | 1.d4 2.Nf3 3.Bf4 | Solid, system-based |

#### 3. Flank Openings
| Opening | Moves | Character |
|---|---|---|
| English Opening | 1.c4 | Flexible, transposes often |
| Réti | 1.Nf3 | Hypermodern, system-based |
| King's Indian Attack | 1.Nf3 2.g3 3.Bg2 | Solid system for White |

---

## Tactical Patterns

### Core Tactics (implement in PuzzlesPage / MatePatternPage)
| Tactic | Description | Key Signal |
|---|---|---|
| **Fork** | One piece attacks two simultaneously | Knight forks are most common |
| **Pin** | Piece can't move without exposing a more valuable piece | Absolute pin = king behind |
| **Skewer** | Like a reverse pin — valuable piece must move, losing what's behind | Queen/Rook skewers |
| **Discovered Attack** | Moving one piece reveals an attack by another | Look for pieces in line |
| **Double Check** | Two pieces give check simultaneously | Only king move can escape |
| **Zwischenzug** | Unexpected intermediate move before the "expected" response | Changes evaluation |
| **Deflection** | Force a defending piece away from its duty | Overloaded defenders |
| **Decoy** | Lure a piece to a bad square | Often precedes a fork or mate |
| **Overloading** | A piece has too many defensive duties | Attack both targets |
| **X-Ray** | Piece exerts influence through another piece | Rooks/Queens behind pieces |

### Checkmate Patterns (implement in MatePatternPage)
| Pattern | Description |
|---|---|
| Back Rank Mate | Rook/Queen mates on the 1st/8th rank; king trapped by own pawns |
| Smothered Mate | Knight delivers check; king smothered by own pieces |
| Scholar's Mate | 4-move mate: Qh5 + Bc4 targeting f7 |
| Fool's Mate | 2-move mate (only works if opponent plays very badly) |
| Epaulette Mate | King trapped between two rooks (like epaulettes) |
| Anastasia's Mate | Knight + Rook mate; knight cuts off escape squares |
| Arabian Mate | Knight + Rook; knight on f6/f3 supports rook on h-file |
| Opera Mate | Bishop + Rook; bishop covers escape square |
| Boden's Mate | Two bishops deliver criss-cross mate |
| Hook Mate | Rook + Knight + Pawn coordinate to mate |
| Dovetail Mate | Queen mate; king's escape blocked by own pieces |

---

## Endgame Technique

### Key Endgame Principles
1. **Activate the king** — king is a strong piece in the endgame
2. **Passed pawns must be pushed**
3. **Rooks belong behind passed pawns** (own or opponent's)
4. **The opposition** — kings facing each other with one square between
5. **Zugzwang** — the obligation to move is a disadvantage

### Essential Endgames to Know
| Endgame | Result | Key Technique |
|---|---|---|
| K+Q vs K | Win | Drive king to edge, then queen + king |
| K+R vs K | Win | Lawnmower / box method |
| K+P vs K | Win/Draw | Key squares, opposition |
| K+2B vs K | Win | Drive to corner |
| K+B+N vs K | Win (difficult) | Drive to correct-colour corner |
| K+B vs K | Draw | Insufficient material |
| K+N vs K | Draw | Insufficient material |
| Lucena Position | Win | Building a bridge (rook endgame) |
| Philidor Position | Draw | Defensive technique (rook endgame) |

---

## Spaced Repetition (SM-2) — Implementation Reference

The SM-2 algorithm used in `SpacedReviewPage`:

```
nextInterval(n, EF, q):
  if q < 3: reset (n=0, interval=1)
  else:
    if n == 0: interval = 1
    if n == 1: interval = 6
    else: interval = prev_interval * EF
  EF = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  EF = max(1.3, EF)
  n++
```

- `q` = quality of recall (0–5)
- `EF` = easiness factor (starts at 2.5)
- `n` = repetition number

---

## Stockfish Integration Reference

### Evaluation Output
- Positive score = good for White
- Negative score = good for Black
- Score in centipawns (100 = 1 pawn advantage)
- `#N` = forced mate in N moves

### Common UCI Commands
```
uci              → initialise engine
isready          → wait for readiness
position fen ... → set position
go depth 15      → analyse to depth 15
go movetime 1000 → analyse for 1000ms
stop             → stop analysis
quit             → exit
```

### Depth Guidelines for MentorChess
| Use Case | Suggested Depth |
|---|---|
| Puzzle hint | depth 10 |
| Game review (per move) | depth 15–18 |
| Full analysis | depth 20+ |
| Real-time coaching | movetime 500ms |

---

## Chess.com API Reference

### Endpoints used in ImportGamesPage
```
GET https://api.chess.com/pub/player/{username}/games/{year}/{month}
GET https://api.chess.com/pub/player/{username}/games/archives
```

### Game format returned
- PGN format inside JSON response
- Fields: `pgn`, `time_class`, `time_control`, `white`, `black`, `result`, `url`

---

## ELO Rating System

| Rating Range | Level |
|---|---|
| < 800 | Beginner |
| 800–1200 | Casual |
| 1200–1600 | Intermediate |
| 1600–2000 | Club Player |
| 2000–2200 | Expert |
| 2200–2400 | Candidate Master |
| 2400–2500 | FIDE Master |
| 2500+ | International Master / Grandmaster |

### EloRoadmap suggestions by rating
- **< 800**: Learn piece movement, basic checkmates, don't hang pieces
- **800–1200**: Basic tactics (forks, pins), control the centre, castle early
- **1200–1600**: Opening principles, endgame basics (K+P, K+R), calculation
- **1600–2000**: Opening repertoire, positional play, advanced endgames
- **2000+**: Deep opening preparation, prophylaxis, complex endgames

---

## Common Chess Terms (for UI labels and tooltips)

| Term | Meaning |
|---|---|
| Blunder | A very bad move (losing significant material or position) |
| Mistake | A bad move (losing some advantage) |
| Inaccuracy | A slightly suboptimal move |
| Tempo | A unit of time (one move); gaining/losing a tempo |
| Initiative | The ability to make threats, forcing opponent to react |
| Compensation | Non-material advantages (activity, structure) offsetting material loss |
| Fianchetto | Developing a bishop to g2/b2/g7/b7 after moving g/b pawn |
| En passant | Special pawn capture after opponent's double pawn push |
| Promotion | Pawn reaching the 8th rank, becoming any piece (usually Queen) |
| Castling | King + Rook special move; kingside (O-O) or queenside (O-O-O) |
