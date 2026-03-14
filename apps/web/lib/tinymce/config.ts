/**
 * TinyMCE Configuration for MC Bible
 * Similar to Moodle's rich text editor with full HTML support
 */

export interface TinyMCEConfigProps {
  apiKey?: string;
  height?: number;
  readonly?: boolean;
}

/**
 * Get TinyMCE configuration
 * Use with no-api-key version or add your own API key
 */
export function getTinyMCEConfig(props: TinyMCEConfigProps = {}) {
  const {
    apiKey = 'no-api-key', // Use without API key (limits some features)
    height = 600,
    readonly = false,
  } = props;

  return {
    height,
    menubar: true,
    readonly,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount',
      'codesample', 'paste', 'directionality', 'emoticons',
    ],
    toolbar: readonly ? undefined : (
      'undo redo | blocks | ' +
      'bold italic underline strikethrough forecolor backcolor | ' +
      'alignleft aligncenter alignright alignjustify | ' +
      'bullist numlist outdent indent | removeformat | link image media codesample | ' +
      'table | code | help | fullscreen'
    ),
    toolbar_mode: 'sliding',
    block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre',

    // Content styling
    content_style: `
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
        font-size: 14px;
        line-height: 1.6;
        padding: 1rem;
      }
      h1, h2, h3, h4, h5, h6 {
        margin-top: 1em;
        margin-bottom: 0.5em;
        font-weight: 600;
      }
      h1 { font-size: 2em; }
      h2 { font-size: 1.5em; }
      h3 { font-size: 1.25em; }
      p { margin-bottom: 1em; }
      ul, ol { margin-bottom: 1em; padding-left: 2em; }
      code {
        background-color: #f4f4f4;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: monospace;
      }
      pre {
        background-color: #f4f4f4;
        padding: 1em;
        border-radius: 4px;
        overflow-x: auto;
      }
      blockquote {
        border-left: 4px solid #ddd;
        padding-left: 1em;
        margin-left: 0;
        color: #666;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 1em;
      }
      table td, table th {
        border: 1px solid #ddd;
        padding: 8px;
      }
      table th {
        background-color: #f2f2f2;
        font-weight: 600;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      a {
        color: #0066cc;
        text-decoration: underline;
      }
      a:hover {
        color: #0052a3;
      }
    `,

    // Allow embedded content from trusted sources
    media_embed_templates: [
      {
        pattern: /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/,
        width: 640,
        height: 360,
      },
      {
        pattern: /(https?:\/\/)?(www\.)?(vimeo\.com)\/.+$/,
        width: 640,
        height: 360,
      },
      {
        pattern: /(https?:\/\/)?(www\.)?(loom\.com)\/.+$/,
        width: 640,
        height: 360,
      },
    ],

    // Allow custom iframe embeds
    extended_valid_elements: 'iframe[*|src|width|height|frameborder|allow|allowfullscreen|class|id|style]',

    // Media embed configurations
    media_live_embeds: true,
    media_url_resolver: (data: any, resolve?: any, reject?: any) => {
      // Allow video URLs to be embedded directly
      if (data.url =~ /^https?:\/\/(www\.)?(youtube|vimeo|loom)\.com/) {
        resolve({
          html: `<iframe src="${data.url}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`
        })
      } else {
        // Default behavior
        resolve?.(data)
      }
    },

    // Paste from Word/Docs cleanup
    paste_as_text: false,
    paste_merge_formats: true,
    paste_auto_cleanup_on_paste: true,
    paste_remove_spans: true,
    paste_remove_styles: true,
    paste_strip_class_attributes: 'all',

    // Link settings
    link_default_target: '_blank',
    link_title: false,

    // Image settings
    image_caption: true,
    image_advtab: true,

    // Table settings
    table_default_attributes: {
      border: '1',
    },
    table_default_styles: {
      'border-collapse': 'collapse',
      width: '100%',
    },

    // Code sample configuration
    codesample_languages: [
      { text: 'JavaScript', value: 'javascript' },
      { text: 'TypeScript', value: 'typescript' },
      { text: 'Python', value: 'python' },
      { text: 'Java', value: 'java' },
      { text: 'C#', value: 'csharp' },
      { text: 'PHP', value: 'php' },
      { text: 'Ruby', value: 'ruby' },
      { text: 'Go', value: 'go' },
      { text: 'Rust', value: 'rust' },
      { text: 'SQL', value: 'sql' },
      { text: 'HTML/XML', value: 'markup' },
      { text: 'CSS', value: 'css' },
      { text: 'Bash/Shell', value: 'bash' },
    ],

    // branding
    branding: false,
    promotion: false,
    resize: true,
    elementpath: true,

    // callbacks
    setup: (editor: any) => {
      // Custom file upload handler
      editor.on('BeforeSetContent', (e: any) => {
        // Additional content processing if needed
      })
    },

    // File upload handler - will be set by the component
    images_upload_handler: undefined,
  };
}

/**
 * Safe HTML sanitization for article content
 * Remove potentially dangerous elements while preserving formatting
 */
export function sanitizeHtml(html: string): string {
  // Basic sanitization - remove script tags, on* attributes, etc.
  let sanitized = html

  // Remove script tags and content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove on* event attributes
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '')

  // Remove javascript: hrefs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '')
  sanitized = sanitized.replace(/href\s*=\s*javascript:[^\s>]*/gi, '')

  return sanitized
}

/**
 * Allowed iframe domains for embeds
 */
export const ALLOWED_IFRAME_DOMAINS = [
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'player.vimeo.com',
  'vimeo.com',
  'www.loom.com',
  'loom.com',
  'docs.google.com',
  'drive.google.com',
  'sheets.google.com',
  'slides.google.com',
]

/**
 * Check if iframe URL is from allowed domain
 */
export function isAllowedIframeDomain(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return ALLOWED_IFRAME_DOMAINS.some(domain =>
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}
