import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Testimonials, { TESTIMONIALS } from './Testimonials.jsx'

afterEach(cleanup)

describe('Testimonials', () => {
  it('ships empty and stays hidden until real quotes exist', () => {
    expect(TESTIMONIALS).toEqual([])
    render(<Testimonials />)
    expect(screen.queryByTestId('testimonials')).toBeNull()
  })

  it('renders quotes with their attribution', () => {
    render(<Testimonials items={[{ quote: 'Saved me an hour.', name: 'Asha', role: 'Backend dev' }, { quote: 'Nice.' }]} />)
    expect(screen.getByTestId('testimonials')).toBeTruthy()
    expect(screen.getByText('“Saved me an hour.”')).toBeTruthy()
    expect(screen.getByText('Asha · Backend dev')).toBeTruthy()
    expect(screen.getByText('“Nice.”')).toBeTruthy()
  })
})
