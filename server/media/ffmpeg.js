import { execFile } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

const FFMPEG = 'ffmpeg'

function run(args, timeout = 300000) {
  return new Promise((resolve, reject) => {
    execFile(FFMPEG, args, { timeout }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout || stderr)
    })
  })
}

export async function imagesToVideo(framesDir, outputPath, fps = 30) {
  // ffmpeg -framerate 30 -i frames/frame_%05d.png -c:v libx264 -pix_fmt yuv420p output.mp4
  await run([
    '-y',
    '-framerate', String(fps),
    '-i', path.join(framesDir, 'frame_%05d.png'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '23',
    outputPath,
  ])
  return outputPath
}

export async function concatAudio(files, outputPath) {
  // Concat WAV files using concat demuxer
  const listFile = outputPath + '.list.txt'
  const content = files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n')
  fs.writeFileSync(listFile, content, 'utf-8')

  await run([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-c', 'copy',
    outputPath,
  ])
  fs.unlinkSync(listFile)
  return outputPath
}

export async function muxVideoAudio(videoPath, audioPath, outputPath) {
  await run([
    '-y',
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-shortest',
    outputPath,
  ])
  return outputPath
}

/**
 * 将 ASS 字幕烧录到视频中
 * 使用 subtitles filter 而非 copy，所以会重新编码
 */
export async function muxVideoAudioSubtitles(videoPath, audioPath, subtitlePath, outputPath) {
  // ffmpeg 的 subtitles filter 需要转义路径中的特殊字符
  const escapedSubPath = subtitlePath.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'")
  await run([
    '-y',
    '-i', videoPath,
    '-i', audioPath,
    '-vf', `subtitles='${escapedSubPath}'`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-shortest',
    outputPath,
  ])
  return outputPath
}

/**
 * 仅将字幕烧录到视频（无音频）
 */
export async function burnSubtitles(videoPath, subtitlePath, outputPath) {
  const escapedSubPath = subtitlePath.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'")
  await run([
    '-y',
    '-i', videoPath,
    '-vf', `subtitles='${escapedSubPath}'`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'copy',
    outputPath,
  ])
  return outputPath
}

export async function getAudioDuration(filePath) {
  const output = await run([
    '-i', filePath,
    '-f', 'null',
    '-',
  ])
  // Parse duration from stderr (ffmpeg outputs info to stderr)
  const match = output.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/)
  if (match) {
    return (
      parseInt(match[1]) * 3600 +
      parseInt(match[2]) * 60 +
      parseInt(match[3]) +
      parseInt(match[4]) / 100
    )
  }
  return 0
}
