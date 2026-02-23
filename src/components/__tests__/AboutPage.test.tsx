import { render, screen } from '@testing-library/react'
import { AboutPage } from '../AboutPage'

describe('AboutPage', () => {
  it('renders "About mashtreewebx" heading', () => {
    render(<AboutPage />)

    const heading = screen.getByText('About mashtreewebx')
    expect(heading).toBeInTheDocument()
    expect(heading.tagName).toBe('H2')
  })

  it('contains link to Mash GitHub repo', () => {
    render(<AboutPage />)

    const mashLink = screen.getByRole('link', { name: 'Mash' })
    expect(mashLink).toBeInTheDocument()
    expect(mashLink).toHaveAttribute('href', 'https://github.com/marbl/Mash')
  })

  it('sets rel="noopener noreferrer" on external links', () => {
    render(<AboutPage />)

    const externalLinks = screen.getAllByRole('link').filter(
      (link) => link.getAttribute('target') === '_blank',
    )

    expect(externalLinks.length).toBeGreaterThan(0)

    for (const link of externalLinks) {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('contains privacy note about client-side processing', () => {
    render(<AboutPage />)

    expect(
      screen.getByText(/No data leaves your machine/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/all processing happens client-side/),
    ).toBeInTheDocument()
  })

  it('contains a References section', () => {
    render(<AboutPage />)

    const heading = screen.getByText('References')
    expect(heading).toBeInTheDocument()
    expect(heading.tagName).toBe('H2')

    expect(screen.getByText(/Mash: fast genome and metagenome/)).toBeInTheDocument()
    expect(screen.getByText(/Mashtree: a rapid comparison/)).toBeInTheDocument()
  })

  it('contains author name "Nabil-Fareed Alikhan"', () => {
    render(<AboutPage />)

    expect(screen.getByText('Nabil-Fareed Alikhan')).toBeInTheDocument()
  })
})
