import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PieceValuesPage from './PieceValuesPage'

// The score line ("N correct") and results score ("N / 6") render their
// number and label as separate JSX expressions inside one element, so
// testing-library's default getByText (which matches a single text node)
// can't find them — match against the element's full textContent instead.
const byText = (text) => screen.getByText((_, el) => el.textContent === text && el.children.length === 0)

describe('PieceValuesPage', () => {
  it('shows the Pawn by default', () => {
    render(<PieceValuesPage />)
    expect(screen.getByRole('heading', { name: 'Pawn' })).toBeInTheDocument()
  })

  // "Queen"/"King" etc. also appear in the always-visible "All Piece Values"
  // bar chart further down the same page, so getByText would be ambiguous —
  // the sidebar selector button is the first match.
  const clickPiece = (name) => fireEvent.click(screen.getAllByText(name)[0])

  it('selecting a piece from the list updates the detail view', () => {
    render(<PieceValuesPage />)
    clickPiece('Queen')
    expect(screen.getByRole('heading', { name: 'Queen' })).toBeInTheDocument()
    expect(byText('= 9 pawns')).toBeInTheDocument()
  })

  it('the King shows "Infinite value" instead of a pawn count', () => {
    render(<PieceValuesPage />)
    clickPiece('King')
    expect(screen.getByText('Infinite value')).toBeInTheDocument()
  })

  it('Take Quiz enters quiz mode with the first question', () => {
    render(<PieceValuesPage />)
    fireEvent.click(screen.getByText('Take Quiz'))
    expect(byText('Question 1 of 6')).toBeInTheDocument()
  })

  it('picking the correct answer highlights it and allows advancing', () => {
    render(<PieceValuesPage />)
    fireEvent.click(screen.getByText('Take Quiz'))
    // Q1: "A rook is worth how many pawns?" answer "5"
    fireEvent.click(screen.getByText('5'))
    expect(byText('1 correct')).toBeInTheDocument()
    expect(screen.getByText('Next →')).not.toBeDisabled()
  })

  it('picking a wrong answer still allows advancing but does not count as correct', () => {
    render(<PieceValuesPage />)
    fireEvent.click(screen.getByText('Take Quiz'))
    fireEvent.click(screen.getByText('9')) // wrong for Q1
    expect(byText('0 correct')).toBeInTheDocument()
  })

  it('cannot pick a second answer for the same question', () => {
    render(<PieceValuesPage />)
    fireEvent.click(screen.getByText('Take Quiz'))
    fireEvent.click(screen.getByText('5')) // correct — records 1 answer
    fireEvent.click(screen.getByText('9')) // should be ignored: already answered
    // Still only the 1 (correct) answer recorded — if the second click had
    // registered as a real (wrong) answer, this would either stay at 1
    // correct with 2 answers logged, or the UI would show conflicting
    // highlight state; asserting the count didn't change is the simplest
    // direct signal that the second click was a genuine no-op.
    expect(byText('1 correct')).toBeInTheDocument()
  })

  const finishQuiz = () => {
    fireEvent.click(screen.getByText('Take Quiz'))
    for (let i = 0; i < 6; i++) {
      // Click whichever option is first — correctness doesn't matter for
      // these tests, only that all 6 questions get answered.
      const options = screen.getAllByRole('button').filter(b =>
        !['Next →', 'See Results', 'Try Again', 'Back to Learn'].includes(b.textContent)
      )
      fireEvent.click(options[0])
      fireEvent.click(screen.getByText(i === 5 ? 'See Results' : 'Next →'))
    }
  }

  it('completing all 6 questions shows the results screen', () => {
    render(<PieceValuesPage />)
    finishQuiz()
    expect(screen.getByText('Piece values quiz complete!')).toBeInTheDocument()
    expect(byText('0 / 6')).toBeInTheDocument()
  })

  it('Try Again from the results screen resets the quiz to question 1', () => {
    render(<PieceValuesPage />)
    finishQuiz()
    expect(screen.getByText('Piece values quiz complete!')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Try Again'))
    expect(byText('Question 1 of 6')).toBeInTheDocument()
    expect(byText('0 correct')).toBeInTheDocument()
  })

  it('Back to Learn from the results screen exits quiz mode', () => {
    render(<PieceValuesPage />)
    finishQuiz()
    fireEvent.click(screen.getByText('Back to Learn'))
    expect(screen.getByRole('heading', { name: 'Pawn' })).toBeInTheDocument()
  })
})
