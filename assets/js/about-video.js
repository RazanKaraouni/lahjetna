document.addEventListener("DOMContentLoaded", function () {
    var video = document.getElementById("introVideo");
    if (!video) return;

    function fitFrameToVideo() {
        if (!video.videoWidth || !video.videoHeight) return;
        video.style.aspectRatio = video.videoWidth + " / " + video.videoHeight;
    }

    video.addEventListener("loadedmetadata", fitFrameToVideo);
    if (video.readyState >= 1) fitFrameToVideo();
});
