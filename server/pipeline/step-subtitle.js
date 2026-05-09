import path from 'node:path'
import { getEpisodeDir, readText, writeText } from '../utils/file-helper.js'

/**
 * 将秒数转为 ASS 时间格式: H:MM:SS.cc
 */
function toAssTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`
}

/**
 * 将长文本按指定最大字数拆成多行（用于字幕换行）
 */
function splitText(text, maxCharsPerLine = 18) {
  // 如果文本很短，直接返回
  if (text.length <= maxCharsPerLine) return text

  // 按标点符号断句
  const punctuation = /[，。！？、；：,.\-!?:;]/
  const lines = []
  let current = ''

  for (const char of text) {
    current += char
    if (punctuation.test(char) && current.length >= maxCharsPerLine * 0.5) {
      lines.push(current.trim())
      current = ''
    }
  }
  if (current.trim()) lines.push(current.trim())

  // 如果断句后每行还是太长，强制按字数切
  const result = []
  for (const line of lines) {
    if (line.length <= maxCharsPerLine) {
      result.push(line)
    } else {
      for (let i = 0; i < line.length; i += maxCharsPerLine) {
        result.push(line.slice(i, i + maxCharsPerLine))
      }
    }
  }

  return result.join('\\N')
}

/**
 * 从 timeline 数据生成 ASS 字幕文件
 */
function generateAss(timeline, options = {}) {
  const {
    fontSize = 48,
    fontName = 'Microsoft YaHei',
    primaryColor = '&H00FFFFFF',  // 白色
    outlineColor = '&H00000000',  // 黑色描边
    outlineWidth = 3,
    shadowDepth = 2,
    marginV = 60,                // 底部边距
    maxCharsPerLine = 18,
  } = options

  const header = `[Script Info]
Title: ${timeline.title || 'AI-Video Subtitles'}
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF,${outlineColor},&H80000000,-1,0,0,0,100,100,0,0,1,${outlineWidth},${shadowDepth},2,40,40,marginV,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`

  const events = []
  const scenes = timeline.scenes || []

  for (const scene of scenes) {
    if (!scene.narration) continue

    const start = toAssTime(scene.start)
    const end = toAssTime(scene.end)
    const text = splitText(scene.narration, maxCharsPerLine)

    events.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`)
  }

  return header.replace('marginV', String(marginV)) + '\n' + events.join('\n') + '\n'
}

/**
 * Step Subtitle: 从 timeline.json 生成 ASS 字幕文件
 */
export async function runStepSubtitle(episode) {
  console.log(`[Step-Subtitle] Generating subtitles for "${episode.title}"...`)

  try {
    const episodeDir = getEpisodeDir(episode.slug)
    const timelinePath = path.join(episodeDir, 'timeline.json')
    const timelineText = readText(timelinePath)

    if (!timelineText) {
      return { success: false, error: 'timeline.json not found. Run timeline step first.' }
    }

    const timeline = JSON.parse(timelineText)

    if (!timeline.scenes || timeline.scenes.length === 0) {
      return { success: false, error: 'No scenes in timeline.json' }
    }

    // 生成 ASS 字幕
    const assContent = generateAss(timeline, {
      title: episode.title,
    })

    const outputDir = path.join(episodeDir, 'output')
    const assPath = path.join(outputDir, `episode-${episode.slug}.ass`)
    writeText(assPath, assContent)

    console.log(`[Step-Subtitle] ASS subtitle ready: ${assPath}`)
    return { success: true, output: assPath }
  } catch (err) {
    console.error('[Step-Subtitle] Error:', err.message)
    return { success: false, error: err.message }
  }
}
