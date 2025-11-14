(function() {
  'use strict';
  
  const processed = new WeakSet();
  
  function findKalturaIframe() {
    return document.querySelector('iframe[src*="kaf.kaltura"]') || 
            document.querySelector('iframe[src*="kaltura.com"]');
    }
  
  function extractM3U8FromIframe(iframe) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
      
      const check = () => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!doc) {
            setTimeout(check, 100);
            return;
          }
          
          const video = doc.querySelector('video');
          if (video && video.currentSrc && video.currentSrc.includes('.m3u8')) {
            clearTimeout(timeout);
            resolve({
              src: video.currentSrc,
              time: video.currentTime || 0
            });
          } else {
            setTimeout(check, 100);
          }
        } catch (e) {
          reject(e);
        }
      };
      
      check();
    });
  }
  
  function replaceWithVideoJS(iframe, m3u8Url, startTime = 0) {
    const container = iframe.parentElement;
    iframe.style.display = 'none';
    
    const videoEl = document.createElement('video');
    videoEl.id = 'vjs-player-' + Date.now();
    videoEl.className = 'video-js vjs-default-skin';
    videoEl.controls = true;
    
    const source = document.createElement('source');
    source.src = m3u8Url;
    source.type = 'application/x-mpegURL';
    videoEl.appendChild(source);
    
    container.appendChild(videoEl);
    
    const player = videojs(videoEl.id, {
      controls: true,
      fluid: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2]
    });
    
    if (startTime > 0) {
      player.currentTime(startTime);
    }
  }
  
  async function hijackPlayer() {
    const iframe = findKalturaIframe();
    if (!iframe || processed.has(iframe)) return;
    
    processed.add(iframe);
    
    try {
      const { src, time } = await extractM3U8FromIframe(iframe);
      replaceWithVideoJS(iframe, src, time);
    } catch (e) {
      console.error('[Canvas Enhancer] Failed:', e);
      processed.delete(iframe);
    }
  }
  
  hijackPlayer();
  
  const observer = new MutationObserver(() => {
    hijackPlayer();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
})();