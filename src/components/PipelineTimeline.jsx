const steps = [
  '资料收集',
  '生成分镜',
  '生成旁白',
  '生成 TTS',
  '校准时间轴',
  '生成 HTML',
  '预览截图',
  '渲染视频',
  '合成成片',
]

export default function PipelineTimeline({ currentStep = 0, failed = false }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {steps.map((label, i) => {
        const stepNum = i + 1
        const isDone = stepNum < currentStep
        const isActive = stepNum === currentStep
        const isFailed = failed && isActive
        return (
          <div key={label} className="flex items-center gap-1 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isFailed
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : isDone
                    ? 'bg-green-500/20 text-green-400'
                    : isActive
                      ? 'bg-tech-500/20 text-tech-400 border border-tech-500/50'
                      : 'bg-gray-800 text-gray-500'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isFailed
                    ? 'bg-red-500 text-white'
                    : isDone
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-tech-500 text-white'
                        : 'bg-gray-700'
                }`}
              >
                {isFailed ? '!' : isDone ? '✓' : stepNum}
              </span>
              {label}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-4 h-px ${
                  isFailed ? 'bg-red-500' : stepNum <= currentStep ? 'bg-tech-500' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
