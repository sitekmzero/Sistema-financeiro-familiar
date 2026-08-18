// Backend Hook: agent_transcribe.js
// Router POST /backend/v1/agents/james/transcribe
// Receives base64-encoded audio (webm/mp4/etc.), sends it to the OpenAI
// Whisper transcription endpoint and returns { text: "..." }.
//
// PocketBase JSVM $http.send has no native multipart support, so the
// multipart/form-data body is constructed manually below.
routerAdd(
  'POST',
  '/backend/v1/agents/james/transcribe',
  (e) => {
    try {
      const userId = e.auth && e.auth.id
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária.')
      }

      const body = e.requestInfo().body || {}
      let audioB64 = (body.audio || '').toString().trim()
      // strip optional data-uri prefix
      const commaIdx = audioB64.indexOf(',')
      if (commaIdx >= 0 && audioB64.indexOf('base64') >= 0 && commaIdx < 80) {
        audioB64 = audioB64.slice(commaIdx + 1)
      }
      const mimeType = (body.mime || 'audio/webm').toString()
      const filename = (body.filename || 'audio.webm').toString()

      if (!audioB64) {
        return e.badRequestError('Áudio (base64) é obrigatório.')
      }

      const apiKey = $os.getenv('OPENAI_API_KEY') || ''
      if (!apiKey || apiKey.indexOf('placeholder') >= 0) {
        return e.json(503, {
          error:
            'OPENAI_API_KEY não configurada no backend. Defina a secret antes de usar a transcrição por voz.',
        })
      }

      // --- decode base64 into a byte array ---
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      const lookup = {}
      for (let i = 0; i < chars.length; i++) lookup[chars[i]] = i

      const clean = audioB64.replace(/[^A-Za-z0-9+/=]/g, '')
      const bytes = []
      let buffer = 0
      let bits = 0
      for (let i = 0; i < clean.length; i++) {
        const c = clean[i]
        if (c === '=') break
        const v = lookup[c]
        if (v === undefined) continue
        buffer = (buffer << 6) | v
        bits += 6
        if (bits >= 8) {
          bits -= 8
          bytes.push((buffer >> bits) & 0xff)
        }
      }

      // --- build multipart/form-data body ---
      const boundary = '----JamesTranscribeBoundary' + $security.randomString(12)
      const crlf = '\r\n'
      const textEncoder = (function () {
        let s = ''
        for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
        return s
      })()

      const parts = []
      parts.push('--' + boundary + crlf)
      parts.push('Content-Disposition: form-data; name="file"; filename="' + filename + '"' + crlf)
      parts.push('Content-Type: ' + mimeType + crlf + crlf)
      parts.push(textEncoder + crlf)
      parts.push('--' + boundary + crlf)
      parts.push('Content-Disposition: form-data; name="model"' + crlf + crlf)
      parts.push('whisper-1' + crlf)
      parts.push('--' + boundary + crlf)
      parts.push('Content-Disposition: form-data; name="language"' + crlf + crlf)
      parts.push('pt' + crlf)
      parts.push('--' + boundary + crlf)
      parts.push('Content-Disposition: form-data; name="response_format"' + crlf + crlf)
      parts.push('json' + crlf)
      parts.push('--' + boundary + '--' + crlf)

      // Join parts then convert the whole string to a byte array.
      const wholeStr = parts.join('')
      const wholeBytes = []
      for (let i = 0; i < wholeStr.length; i++) {
        wholeBytes.push(wholeStr.charCodeAt(i) & 0xff)
      }

      const res = $http.send({
        method: 'POST',
        url: 'https://api.openai.com/v1/audio/transcriptions',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          Authorization: 'Bearer ' + apiKey,
        },
        body: wholeBytes,
        timeout: 30,
      })

      if (res.statusCode !== 200) {
        console.log('Whisper transcribe error status', res.statusCode, res.raw)
        return e.json(res.statusCode, {
          error: 'Não foi possível transcrever o áudio no momento.',
        })
      }

      const parsed = res.json
      const text = (parsed && parsed.text) || ''
      if (!text) {
        return e.json(200, { text: '' })
      }
      return e.json(200, { text: text })
    } catch (err) {
      console.log('Error in agent_transcribe hook:', err)
      return e.json(500, { error: 'Erro interno ao transcrever o áudio.' })
    }
  },
  $apis.requireAuth(),
)
