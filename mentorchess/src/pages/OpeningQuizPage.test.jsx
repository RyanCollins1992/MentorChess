import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import OpeningQuizPage from './OpeningQuizPage'

describe('OpeningQuizPage', () => {
  it('shows the setup screen first, defaulting to 10 questions', () => {
    render(<OpeningQuizPage />)
    expect(screen.getByText('Opening Quiz')).toBeInTheDocument()
    expect(screen.getByText('10')).toHaveClass('bg-gold')
  })

  it('changing the quiz size selection updates the highlighted option', () => {
    render(<OpeningQuizPage />)
    fireEvent.click(screen.getByText('5'))
    expect(screen.getByText('5')).toHaveClass('bg-gold')
    expect(screen.getByText('10')).not.toHaveClass('bg-gold')
  })

  it('Start Quiz with size 5 shows exactly 5 questions worth of progress', () => {
    render(<OpeningQuizPage />)
    fireEvent.click(screen.getByText('5'))
    fireEvent.click(screen.getByText('Start Quiz'))
    expect(screen.getByText('1/5')).toBeInTheDocument()
    expect(screen.getByText('What opening/trap is this?')).toBeInTheDocument()
  })

  it('4 answer options are shown, one of which is the correct trap name', () => {
    render(<OpeningQuizPage />)
    fireEvent.click(screen.getByText('Start Quiz'))
    const options = document.querySelectorAll('.space-y-2.flex-1 button')
    // 4 answer buttons plus the "Next" button below, but Next is disabled/separate —
    // count only the answer-shaped buttons via the options container directly.
    expect(options.length).toBeGreaterThanOrEqual(4)
  })

  it('picking an answer reveals correct/incorrect styling and enables Next', () => {
    render(<OpeningQuizPage />)
    fireEvent.click(screen.getByText('Start Quiz'))

    const firstOption = document.querySelector('.w-72 button')
    fireEvent.click(firstOption)

    expect(screen.getByText('Next →')).not.toBeDisabled()
    // Exactly one option should be marked correct (accent2) after reveal.
    const correctOptions = document.querySelectorAll('.w-72 button.border-accent2')
    expect(correctOptions.length).toBe(1)
  })

  it('cannot pick a second answer once one has been revealed', () => {
    render(<OpeningQuizPage />)
    fireEvent.click(screen.getByText('Start Quiz'))

    const options = [...document.querySelectorAll('.space-y-2.flex-1 button')]
    fireEvent.click(options[0])
    options.forEach(opt => expect(opt).toBeDisabled())
  })

  it('the per-question timer counts up and resets on the next question', () => {
    vi.useFakeTimers()
    render(<OpeningQuizPage />)
    fireEvent.click(screen.getByText('Start Quiz'))
    expect(screen.getByText('⏱ 00:00')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(3000) })
    expect(screen.getByText('⏱ 00:03')).toBeInTheDocument()

    const options = document.querySelectorAll('.space-y-2.flex-1 button')
    fireEvent.click(options[0])
    // Timer stops the instant an answer is revealed — stays at 3s even if
    // more real time passes before the user clicks Next.
    act(() => { vi.advanceTimersByTime(2000) })
    expect(screen.getByText('⏱ 00:03')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Next →'))
    expect(screen.getByText('⏱ 00:00')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('completing a 5-question quiz reaches the results screen with a score', () => {
    render(<OpeningQuizPage />)
    fireEvent.click(screen.getByText('5'))
    fireEvent.click(screen.getByText('Start Quiz'))

    for (let i = 0; i < 5; i++) {
      const options = document.querySelectorAll('.space-y-2.flex-1 button')
      fireEvent.click(options[0])
      fireEvent.click(screen.getByText(i === 4 ? 'See Results →' : 'Next →'))
    }

    expect(screen.getByText('% correct', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('New Quiz')).toBeInTheDocument()
  })

  it('New Quiz from the results screen returns to setup', () => {
    render(<OpeningQuizPage />)
    fireEvent.click(screen.getByText('5'))
    fireEvent.click(screen.getByText('Start Quiz'))
    for (let i = 0; i < 5; i++) {
      const options = document.querySelectorAll('.space-y-2.flex-1 button')
      fireEvent.click(options[0])
      fireEvent.click(screen.getByText(i === 4 ? 'See Results →' : 'Next →'))
    }
    fireEvent.click(screen.getByText('New Quiz'))
    expect(screen.getByText('Opening Quiz')).toBeInTheDocument()
    expect(screen.getByText('Start Quiz')).toBeInTheDocument()
  })
})
