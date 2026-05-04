export default function Root({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* viewport-fit=cover: content extends under iOS notch/Dynamic Island */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* iOS: full-screen standalone mode, no Safari chrome */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Aria" />
        <link rel="apple-touch-icon" href="/assets/icon-192.png" />
        <link rel="apple-touch-startup-image" href="/assets/splash.png" />

        {/* Android / Chrome PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#6366f1" />
        <link rel="manifest" href="/manifest.json" />

        {/* Style reset for full-height React Native Web layout */}
        <style
          id="expo-reset"
          dangerouslySetInnerHTML={{
            __html: `html,body{height:100%}body{overflow:hidden}#root{display:flex;height:100%;flex:1}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
