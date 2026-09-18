/**
 * Tiny WAV generator — used by GET /api/tracks/:id/stream so the
 * browser's HTMLAudioElement actually decodes bytes and currentTime
 * advances when playback starts. We deliberately don't ship a real MP3
 * (avoids a binary asset in the template tree and an external CDN
 * dependency).
 *
 * The output is a valid mono 16-bit PCM WAV containing the requested
 * duration of silence. At 8kHz/1s this is ~16KB.
 *
 * @module
 */

export interface SilentWavOptions {
  durationSeconds?: number
  sampleRate?: number
}

export function generateSilentWavBuffer(opts: SilentWavOptions = {}): Buffer {
  const durationSeconds = Math.max(0.1, Math.min(10, opts.durationSeconds ?? 1))
  const sampleRate = Math.max(4000, Math.min(48000, opts.sampleRate ?? 8000))
  const numChannels = 1
  const bitsPerSample = 16
  const numSamples = Math.floor(durationSeconds * sampleRate)
  const dataSize = numSamples * numChannels * (bitsPerSample / 8)
  const fileSize = 44 + dataSize

  const buf = Buffer.alloc(fileSize)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(fileSize - 8, 4)
  buf.write('WAVE', 8)

  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16) // PCM chunk size
  buf.writeUInt16LE(1, 20) // audio format = PCM
  buf.writeUInt16LE(numChannels, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28) // byte rate
  buf.writeUInt16LE(numChannels * (bitsPerSample / 8), 32) // block align
  buf.writeUInt16LE(bitsPerSample, 34)

  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)
  // PCM samples are zero-filled by Buffer.alloc → silence. Done.

  return buf
}
