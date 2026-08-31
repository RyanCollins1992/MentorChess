import { Chess } from 'chess.js'
import { TRAPS } from './src/data/traps.js'

console.log('Validating all traps...\n')

let totalValid = 0
let totalInvalid = 0

TRAPS.forEach(trap => {
  console.log(`\n📋 ${trap.name} (${trap.id})`)
  console.log(`   Opening: ${trap.opening}`)
  console.log(`   Color: ${trap.color}`)
  console.log(`   Moves: ${trap.moves.length}`)
  
  const chess = new Chess(trap.fen)
  let isValid = true
  let failedMove = null
  let failedMoveIdx = null

  for (let i = 0; i < trap.moves.length; i++) {
    const move = trap.moves[i]
    let result
    try {
      result = chess.move(move, { sloppy: true })
    } catch {
      result = null
    }
    
    if (!result) {
      isValid = false
      failedMove = move
      failedMoveIdx = i
      console.log(`      Current position before move: ${chess.fen()}`)
      console.log(`      Legal moves: ${chess.moves().join(', ')}`)
      break
    }
  }

  if (isValid) {
    console.log(`   ✅ All ${trap.moves.length} moves are valid`)
    console.log(`   Final FEN: ${chess.fen()}`)
    totalValid++
  } else {
    console.log(`   ❌ Move #${failedMoveIdx + 1} FAILED: "${failedMove}"`)
    console.log(`      Position before failed move:`)
    chess.undo()
    console.log(`      FEN: ${chess.fen()}`)
    console.log(`      Legal moves: ${chess.moves({ verbose: false }).join(', ')}`)
    totalInvalid++
  }
})

console.log(`\n${'='.repeat(60)}`)
console.log(`\n📊 SUMMARY: ${totalValid} valid, ${totalInvalid} invalid\n`)

if (totalInvalid > 0) {
  process.exit(1)
} else {
  console.log('✅ All traps validated successfully!')
}
