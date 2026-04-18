import { useState, useRef } from 'react'
import { Upload, X, CheckCircle, FileText, Image } from 'lucide-react'

function FileIcon({ type }) {
  if (type?.startsWith('image/')) return <Image className="w-5 h-5 text-indigo-500" />
  return <FileText className="w-5 h-5 text-indigo-500" />
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUpload({
  label = 'Upload Files',
  hint = 'JPG, PNG, MP4, PDF up to 50MB',
  accept = 'image/*,video/*,.pdf',
  multiple = true,
  files = [],
  onChange,
}) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles)
    if (multiple) onChange([...files, ...arr])
    else onChange(arr.slice(0, 1))
  }

  const removeFile = (idx) => onChange(files.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      {label && <p className="label">{label}</p>}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]'
            : files.length > 0
            ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 hover:border-emerald-500'
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
            dragOver ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-700'
          }`}>
            <Upload className={`w-6 h-6 transition-colors ${dragOver ? 'text-indigo-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {dragOver ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              or <span className="text-indigo-600 dark:text-indigo-400 font-medium">click to browse</span>
            </p>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0">
                {file.type?.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <FileIcon type={file.type} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
              </div>
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
