export default function VideoPlayer({ src }) {
  if (!src) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="aspect-video bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-2">
              <span className="text-gray-500 text-lg">▶</span>
            </div>
            <p className="text-gray-600 text-xs">视频预览</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <video
        className="w-full aspect-video"
        controls
        src={src}
      >
        您的浏览器不支持视频播放
      </video>
    </div>
  )
}
