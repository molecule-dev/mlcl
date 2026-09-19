import { useParams } from 'react-router'

import { PuzzleGame } from '../components/PuzzleGame.js'

/**
 * A past day replayed as practice: same game, same feedback, zero streak
 * effect (the API marks these results practice=true and never folds them
 * into user_stats).
 */
export function ArchivePlay() {
  const { date } = useParams<{ date: string }>()
  return <PuzzleGame date={date} />
}

export default ArchivePlay
