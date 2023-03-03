//主に２つの処理

//  1.  video属性にストリームを表示ーーーーーーーーーーーーーーーーーーーーーーーー
let videoAct;
videoAct = loadVideo(); // video属性をロード↓


// video属性のロード
async function loadVideo() {
    const video = await setupCamera(); // カメラのセットアップ↓
    video.play();
    return video;
}

// カメラのセットアップ
async function setupCamera() {
    const video = document.getElementById('video');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
            'audio': false,
            'video': true
        });
        video.srcObject = stream;

        return new Promise(resolve => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } else {
        const errorMessage = "This browser does not support video capture, or this device does not have a camera";
        alert(errorMessage);
        return Promise.reject(errorMessage);
    }
}


//  2.  button要素で推定実行！ーーーーーーーーーーーーーーーーーーーーーーーーーーー
const buttonPredict = document.getElementById('predict');

var imageScaleFactor = 0.2;
var outputStride = 16;
var flipHorizontal = true;

const predictExecute = () => {
    bindPage();
}

async function bindPage() {
    posenet.load().then(function (net) {
        return net.estimateSinglePose(
            //document.getElementById('human'),

            document.getElementById('video'),
            imageScaleFactor,
            flipHorizontal,
            outputStride
        )
    }).then(function (pose) {
        console.log(pose);

        //計算し、DBを更新
        // Get a reference to the database service
        var database = firebase.database()
        var updates = {};

        //基準とする[頭]のサイズを出す
        var head_size = parseFloat(Math.sqrt(
            (pose.keypoints[3].position["x"] - pose.keypoints[4].position["x"]) ** 2
            + (pose.keypoints[3].position["y"] - pose.keypoints[4].position["y"]) ** 2
        ).toFixed(2));


        //各部位が[頭]何個分かを求め、顔のサイズをかける

        updates["obj0002/length"] = parseFloat(
            (Math.sqrt(
                (((pose.keypoints[6].position["x"] + pose.keypoints[5].position["x"]) / 2) - ((pose.keypoints[12].position["x"] + pose.keypoints[11].position["x"]) / 2)) ** 2
                + (((pose.keypoints[6].position["y"] + pose.keypoints[5].position["y"]) / 2) - ((pose.keypoints[12].position["y"] + pose.keypoints[11].position["y"]) / 2)) ** 2
            ) / head_size)
            * 60
        ).toFixed(2);

        updates["obj0003/length"] = parseFloat(
            (Math.sqrt(
                (pose.keypoints[6].position["x"] - pose.keypoints[8].position["x"]) ** 2
                + (pose.keypoints[6].position["y"] - pose.keypoints[8].position["y"]) ** 2
            ) / head_size)
            * 60
        ).toFixed(2);

        updates["obj0004/length"] = parseFloat(
            (Math.sqrt(
                (pose.keypoints[8].position["x"] - pose.keypoints[10].position["x"]) ** 2
                + (pose.keypoints[8].position["y"] - pose.keypoints[10].position["y"]) ** 2
            ) / head_size)
            * 60
        ).toFixed(2);

        updates["obj0005/length"] = parseFloat(
            (Math.sqrt(
                (pose.keypoints[5].position["x"] - pose.keypoints[7].position["x"]) ** 2
                + (pose.keypoints[5].position["y"] - pose.keypoints[7].position["y"]) ** 2
            ) / head_size)
            * 60
        ).toFixed(2);

        updates["obj0006/length"] = parseFloat(
            (Math.sqrt(
                (pose.keypoints[7].position["x"] - pose.keypoints[9].position["x"]) ** 2
                + (pose.keypoints[7].position["y"] - pose.keypoints[9].position["y"]) ** 2
            ) / head_size)
            * 60
        ).toFixed(2);

        updates["obj0008/length"] = parseFloat(
            (Math.sqrt(
                (pose.keypoints[12].position["x"] - pose.keypoints[14].position["x"]) ** 2
                + (pose.keypoints[12].position["y"] - pose.keypoints[14].position["y"]) ** 2
            ) / head_size)
            * 60
        ).toFixed(2);

        updates["obj0009/length"] = parseFloat(
            (Math.sqrt(
                (pose.keypoints[14].position["x"] - pose.keypoints[16].position["x"]) ** 2
                + (pose.keypoints[14].position["y"] - pose.keypoints[16].position["y"]) ** 2
            ) / head_size)
            * 60
        ).toFixed(2);

        updates["obj0010/length"] = parseFloat(
            (Math.sqrt(
                (pose.keypoints[11].position["x"] - pose.keypoints[13].position["x"]) ** 2
                + (pose.keypoints[11].position["y"] - pose.keypoints[13].position["y"]) ** 2
            ) / head_size)
            * 60
        ).toFixed(2);

        updates["obj0011/length"] = parseFloat(
            (Math.sqrt(
                (pose.keypoints[13].position["x"] - pose.keypoints[15].position["x"]) ** 2
                + (pose.keypoints[13].position["y"] - pose.keypoints[15].position["y"]) ** 2
            ) / head_size)
            * 60
        ).toFixed(2);


        //database.ref('/human_A/Object').on('value',
        //function(snapshot){ーーー});

        database.ref('/human_A/Object').update(
            updates
            , (error) => {
                if (error) {
                    //The write failed...
                } else {
                    console.log("Data Saved");

                    //以下にPivの更新処理をかく
                    database.ref('human_A/Object/').on('value', function (snap) {
                        var updates2 = {}

                        updates2['/obj0001/Piv'] = {
                            x: 0,
                            y: 0,
                            z: 0
                        };
                        updates2['/obj0002/Piv'] = {
                            x: 0,
                            y: parseFloat(snap.child('obj0008/length').val())
                                + parseFloat(snap.child('obj0009/length').val())
                                + 20,
                            z: 0
                        };
                        updates2['/obj0003/Piv'] = {
                            x: -25,
                            y: parseFloat(snap.child('obj0002/length').val())
                                - 10,
                            z: 0
                        };
                        updates2['/obj0004/Piv'] = {
                            x: -parseFloat(snap.child('obj0003/length').val()),
                            y: 0,
                            z: 0
                        };
                        updates2['/obj0005/Piv'] = {
                            x: 25,
                            y: parseFloat(snap.child('obj0002/length').val())
                                - 10,
                            z: 0
                        };
                        updates2['/obj0006/Piv'] = {
                            x: parseFloat(snap.child('obj0005/length').val()),
                            y: 0,
                            z: 0
                        };
                        updates2['/obj0007/Piv'] = {
                            x: 0,
                            y: parseFloat(snap.child('obj0008/length').val())
                                + parseFloat(snap.child('obj0009/length').val())
                                + 10,
                            z: 0
                        };
                        updates2['/obj0008/Piv'] = {
                            x: -25,
                            y: -10,
                            z: 0
                        };
                        updates2['/obj0009/Piv'] = {
                            x: 0,
                            y: -parseFloat(snap.child('obj0008/length').val()),
                            z: 0
                        };
                        updates2['/obj0010/Piv'] = {
                            x: 25,
                            y: -10,
                            z: 0
                        };
                        updates2['/obj0011/Piv'] = {
                            x: 0,
                            y: -parseFloat(snap.child('obj0010/length').val()),
                            z: 0
                        };

                        database.ref('/human_A/Panel').update(updates2);

                    });
                }
            }
        );

    });
}


;

//ボタン押下時に姿勢推定を実行
buttonPredict.addEventListener('click', predictExecute);