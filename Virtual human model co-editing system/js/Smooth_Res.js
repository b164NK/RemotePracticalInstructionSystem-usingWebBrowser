window.onload = function(){
	//ローディング画面のDOM要素を所得
	const spinner = document.getElementById('loading');

	//タッチイベントが利用可能かどうかの判別
	var supportTouch = 'ontouchend' in document;

	//イベント名の決定
	const EVENTNAME_START = supportTouch? 'touchstart':'mousedown';
	const EVENTNAME_MOVE = supportTouch? 'touchmove':'mousemove';
	const EVENTNAME_END = supportTouch? 'touchend':'mouseup';

	
	var onMouseDownMouseX = 0, onMouseDownMouseY = 0,
	lon = 0, onMouseDownLon = 0,
	lat = 0, onMouseDownLat = 0;

	//選択中のPivotを保持する変数
	let selected_Pivot = 0;

	//Meshが選択中かどうか判別するフラグ
	let flag_sel = 0;
	//選択されたメッシュのピボットが保持されたかを判別するフラグ
	let flag_hol = 0;
	//回転の許可を示すフラグ
	let flag_rot = 0;

	//マウスでオブジェクトをドラックしているかのフラグ
	let flag_drug = false;

	//初期描画時、接合関係を結ぶ時のIDホールダー
	let IDson,IDparent = 0;

	//Promiseコンストラクター
	//flagを受け取って、正ならば次の処理に渡す
	function asyncProcess(value){
		return new Promise((resolve,reject) => {
			setTimeout(() => {
				if(value == 1){
					resolve('選択されています');
				}else{
					reject('選択されていません');
				}
			},100);                       //flag が1になるのを待つための時間
		});
	}

	//次のステップへ進めるための、仮のプロセス
	function asyncProcess_q(value){
		return new Promise((resolve,reject) => {
			setTimeout(() => {
				if(value){
					resolve();
				}else{
					reject('error発生');
				}
			},0)
		})
	}


	// Get a reference to the database service
	var database = firebase.database();

	//Vueインスタンスが存在するかどうかを判別するフラグ
	var first = true;

	//更新内容を一時保存する変数
	var updates = {};

	//処理時間計測用・更新ボタン押した時
	var startTime = 0;
	var startCHDBBYSOME = 0;
	var endCHDBBYSOME = 0;

	//ミリ秒間待機する main()
	function sleep(ms){
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	async function main(){
		console.log('start');
		await sleep(1*1000);
		console.log(0);
		await sleep(1*1000);
		console.log(1);
		await sleep(1*1000);

		for(var i = 2; i<5 ; i++){
			console.log(i);
			await sleep(1*1000);
		}

		console.log('end');
	};


	//更新関数処理の計測用フラグ
	let Upfirst = true;
	//ドラッグ処理の計測用フラグ
	let Drugfirst = true;



	//更新関数
	function renewDB() {
			if(Upfirst){
				performance.mark('UpStart');
			}

			if(flag_drug){
					if(updates == {}){
							setTimeout(function(){
										renewDB();
							}.bind(this),10);
					}else{
							database.ref("human_A/Motion/").update(
									updates,
									(error) =>{
											if(error){
											}else{

												if(Upfirst){
													Upfirst = false;
													performance.mark('UpEnd');
												}

												//データベース更新が完了した際の処理↓
												setTimeout(function(){
															renewDB();
												}.bind(this),10);

											}
									}

							);
					}
			}else{
					return;
			}
	}


	//Vueインスタンスをいれる変数
	//インスタンス外部からメソッドを呼ぶのに利用する
	var vm;

	function createV(fss){
			vm = new Vue({
					el:"#app",
					data:{
							canvas:       							0,
							//時間バーの値を保持
							bar_value:								0,
							//選ばれた部位を保持
							selected_parts_name:					0,
							selected_parts:							0,
							//角度バーに反映された直後の値を保持
							selected_parts_rotX:					0,
							selected_parts_rotY:					0,
							selected_parts_rotZ:					0,
							//部位が選択された時のrotationを角度バーに反映
							rotationX_bar:							0,
							rotationY_bar:							0,
							rotationZ_bar:							0,
							scene:        							new THREE.Scene(),
							renderer:     							new THREE.WebGLRenderer({anitialias: true}),
							camera:       							new THREE.PerspectiveCamera(45,1,1,10000),
							controls:     							0,
							light:        							new THREE.DirectionalLight(0xFFFFFF, 1),
							//メッシュリストを保持(レイキャスターに使用)
							MeshList:								[],
							//ピボットリストを保持
							PivotList:								[],
							//オブジェクト識別IDリストを保持
							IdList:									[],
							//オブジェクト別名前リスト
							obj_name_list:							[],
							//ピボットリストを子要素として保持（キーフレームアニメーションに使用）
							AnimationList:							new THREE.Group(),
							//マウス座標管理用のベクトルを生成
							mouse:									new THREE.Vector2(),
							//レイキャスターを作成
							raycaster:								new THREE.Raycaster(),
							//再生用のhumanグループ(その他の部位も)
							human:        							new THREE.Group(),
							//編集用のhuman
							human_clone:							0,
							//キーフレームトラックを保持(データベースとのデータ共有に使用)
							keyframetracks:							[],
							//アニメーションクリップを保持(データベースとのデータ共有に使用)
							clips:        							[],
							//ミキサーを保持(アニメーション実行に使用)
							mixers:									[],
							//アニメーションアクションを保持(アニメーション実行に使用)
							actions:      							[],
							//再生時にactionsをリセットする必要があるかのチェックをするフラグ
							reset_flag:								false,
							//カメラ操作と編集を切り替えるボタン
							button_mes:								"Edit Mode:Object",
							eventstart:   							EVENTNAME_START,
							eventmove:    							EVENTNAME_MOVE,
							eventend:     							EVENTNAME_END
		},
					methods:{
							//データが変更された時実行する
							changed_DB_bySomeone:function(ss){

									//human_cloneに対するアニメーションを停止
									this.actions[0].stop();

									//clips,mixers,actionsを作り直す
									this.clips = [];
									this.mixers = [];
									this.actions = [];

									//更新されたデータベースの情報を即反映する~~~~~~~~~~~
									//	ss=
									//		id:"00xx"
									//		x:	{times: [-], values:	[-]}
									//		y:	{times: [-], values:	[-]}
									//		z:	{times: [-], values:	[-]}

									//id値から、対応するkeyframeを特定し
									//３つのkeyframeをx,y,z配列で更新
									var kf_index_i = parseInt(ss.child("id").val()) - 2;
									for(var j = 0; j < 3;j++){
												if(j == 0){
														var rot_name = "x";
												}else if (j == 1) {
														var rot_name = "y";
												}else if (j == 2) {
														var rot_name = "z";
												}
												this.keyframetracks[3*kf_index_i + j].times		= ss.child(rot_name+"/times").val();
												this.keyframetracks[3*kf_index_i + j].values	= ss.child(rot_name+"/values").val();
									};
									var clipJSON_Human = {
												duration: 4,
												name:"human_animation",
												tracks: [
												this.keyframetracks[0],
												this.keyframetracks[1],
												this.keyframetracks[2],

												this.keyframetracks[15],
												this.keyframetracks[16],
												this.keyframetracks[17],

												this.keyframetracks[3],
												this.keyframetracks[4],
												this.keyframetracks[5],

												this.keyframetracks[6],
												this.keyframetracks[7],
												this.keyframetracks[8],

												this.keyframetracks[9],
												this.keyframetracks[10],
												this.keyframetracks[11],

												this.keyframetracks[12],
												this.keyframetracks[13],
												this.keyframetracks[14],

												this.keyframetracks[18],
												this.keyframetracks[19],
												this.keyframetracks[20],

												this.keyframetracks[21],
												this.keyframetracks[22],
												this.keyframetracks[23],

												this.keyframetracks[24],
												this.keyframetracks[25],
												this.keyframetracks[26],

												this.keyframetracks[27],
												this.keyframetracks[28],
												this.keyframetracks[29]
												]
									};

									var clip_all = THREE.AnimationClip.parse(clipJSON_Human);
									this.clips.push(clip_all);
									var all_mixer = new THREE.AnimationMixer(this.human_clone);
									this.mixers.push(all_mixer);
									var all_action = this.mixers[0].clipAction(this.clips[0]);
									this.actions.push(all_action);
									this.actions[0].setLoop(THREE.LoopOnce);
									this.actions[0].play();

									//bar_valueに応じたポーズに描画更新
									this.FrameSelect();


							},
							//Orbit操作に対して描画を更新するためのメソッド
							OrbitStart:function(e){
									e.preventDefault();
									this.canvas.addEventListener(this.eventmove,this.OrbitMove);
									this.canvas.addEventListener(this.eventend,this.OrbitEnd);
							},
							OrbitMove:function(e){
									this.controls.update();
									console.log("from OrbitMove");
									this.renderer.render(this.scene, this.camera);
							},
							OrbitEnd:function(e){
									this.canvas.removeEventListener(this.eventmove,this.OrbitMove);
									this.canvas.removeEventListener(this.eventend,this.OrbitEnd);
							},
							//アニメーションを再生する
							animate:function(e){
									console.log("animation start!");
									//リセットが必要かどうかのチェック
									if(this.reset_flag){
											this.actions[0].reset();
											this.reset_flag = false;
									};

									console.log("再生中");
									this.scene.remove(this.human);
									this.scene.add(this.human_clone);

									this.mixers[0].update(0.01);

									this.controls.update();
									this.renderer.render(this.scene, this.camera);

									if(this.actions[0].isRunning() == false){
											const flag = true;
											try {
													if (flag) {
															//アニメーションをもう一度再生する時に備えてリセットしておく
															this.actions[0].reset();
															this.scene.remove(this.human_clone);
															this.scene.add(this.human);
															this.FrameSelect();
															throw new Error('終了します');
													};
											} catch (e) {
													console.log(e.message);
											};

									}else{
											requestAnimationFrame(this.animate);
									};


							},
							//フレーム選択時に実行する
							FrameSelect:function(e){
									//console.log("NowFrame:"+this.bar_value);

									var time = this.bar_value;
									this.actions[0].time = time;
									this.mixers[0].time = time;
									this.mixers[0].update(0);

									//actions,mixersによって算出されたrotationを
									//編集用のhumanに適用する.

									//体の回転
									this.PivotList[0].children[0].rotation.set(
											this.human_clone.children[0].rotation.x,
											this.human_clone.children[0].rotation.y,
											this.human_clone.children[0].rotation.z
									);
									//右上腕の回転
									this.PivotList[0].children[0].children[2].rotation.set(
											this.human_clone.children[0].children[2].rotation.x,
											this.human_clone.children[0].children[2].rotation.y,
											this.human_clone.children[0].children[2].rotation.z
									);
									//右前腕の回転
									this.PivotList[0].children[0].children[2].children[1].rotation.set(
											this.human_clone.children[0].children[2].children[1].rotation.x,
											this.human_clone.children[0].children[2].children[1].rotation.y,
											this.human_clone.children[0].children[2].children[1].rotation.z
									);
									//左上腕の回転
									this.PivotList[0].children[0].children[3].rotation.set(
											this.human_clone.children[0].children[3].rotation.x,
											this.human_clone.children[0].children[3].rotation.y,
											this.human_clone.children[0].children[3].rotation.z
									);
									//左前腕の回転
									this.PivotList[0].children[0].children[3].children[1].rotation.set(
											this.human_clone.children[0].children[3].children[1].rotation.x,
											this.human_clone.children[0].children[3].children[1].rotation.y,
											this.human_clone.children[0].children[3].children[1].rotation.z
									);
									//腰の回転
									this.PivotList[0].children[1].rotation.set(
											this.human_clone.children[1].rotation.x,
											this.human_clone.children[1].rotation.y,
											this.human_clone.children[1].rotation.z
									);
									//右大腿の回転
									this.PivotList[0].children[1].children[1].rotation.set(
											this.human_clone.children[1].children[1].rotation.x,
											this.human_clone.children[1].children[1].rotation.y,
											this.human_clone.children[1].children[1].rotation.z
									);
									//右下腿の回転
									this.PivotList[0].children[1].children[1].children[1].rotation.set(
											this.human_clone.children[1].children[1].children[1].rotation.x,
											this.human_clone.children[1].children[1].children[1].rotation.y,
											this.human_clone.children[1].children[1].children[1].rotation.z
									);
									//左大腿の回転
									this.PivotList[0].children[1].children[2].rotation.set(
											this.human_clone.children[1].children[2].rotation.x,
											this.human_clone.children[1].children[2].rotation.y,
											this.human_clone.children[1].children[2].rotation.z
									);
									//左下腿の回転
									this.PivotList[0].children[1].children[2].children[1].rotation.set(
										this.human_clone.children[1].children[2].children[1].rotation.x,
										this.human_clone.children[1].children[2].children[1].rotation.y,
										this.human_clone.children[1].children[2].children[1].rotation.z
									);


									this.controls.update();
									this.renderer.render(this.scene, this.camera);
									this.reset_flag = true;

							},
							//マウス位置の把握　レイキャスターで利用
							handleMouseMove:function(e){
									const element = event.currentTarget;
									const x = event.clientX - element.offsetLeft;
									const y = event.clientY - element.offsetTop;

									const w = element.offsetWidth;
									const h = element.offsetHeight;

									this.mouse.x = (x/w) * 2 - 1;
									this.mouse.y = -(y/h) * 2 + 1;
							},
							//クリック時〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜
							grapObject:function(e){

									e.preventDefault();
									this.raycaster.setFromCamera(this.mouse, this.camera);
									const intersects = this.raycaster.intersectObjects(this.human.children, true);

									if(intersects.length === 0){
											console.log('パーツが見つかりませんでした');
									}else{
											//回転操作へ
											this.MeshList.map(mesh => {
													// 交差しているオブジェクトが1つ以上存在し、
													// 交差しているオブジェクトの1番目(最前面)のものだったら
													if (intersects.length > 0 && mesh === intersects[0].object) {
															console.log("find");
															flag_sel = 1;

															//ドラッグ中のフラグを立てる
															flag_drug = true;

															asyncProcess(flag_sel).then(
																responce => {
																	console.log(responce);

																	//meshと回転中心の対応付けはname属性を用いて行う

																	for(let i = 0; i < this.MeshList.length; i++){
																		if(this.MeshList[i] === mesh){
																				for(let j = 0; j < this.PivotList.length; j++){
																					if(this.MeshList[i].name === this.PivotList[j].name){
																							selected_Pivot = this.PivotList[j];
																					}
																				}
																		}
																	}


																	flag_hol = 1;
																	return asyncProcess(flag_hol);
																}
															).then(
																responce => {
																	console.log('lon,latの初期設定');
																	lon = selected_Pivot.rotation.y;
																	lat = selected_Pivot.rotation.x;

																	return asyncProcess_q(1);
																}
															).then(
																responce => {
																	console.log('lon,latの設定２');
																	onMouseDownLon = lon;
																	onMouseDownLat = lat;

																	return asyncProcess_q(1);
																}
															).then(
																responce => {
																	console.log('flag_rotを立てる');
																	flag_rot = 1;

																	return asyncProcess(flag_rot)
																}
															).then(
																response => {
																	console.log('イベントリスナー等の設定');
																	if(e.clientX) {
																			onMouseDownMouseX = e.clientX;
																			onMouseDownMouseY = e.clientY;
																	} else if(event.touches) {
																			onMouseDownMouseX = e.touches[0].clientX
																			onMouseDownMouseY = e.touches[0].clientY;
																	} else {
																			onMouseDownMouseX = e.changedTouches[0].clientX
																			onMouseDownMouseY = e.changedTouches[0].clientY
																	}

																	this.canvas.addEventListener( this.eventmove, this.onDocumentMove, false );
																	this.canvas.addEventListener( this.eventend, this.onDocumentUp, false );

																	//更新関数を起動
																	renewDB();



																}
															).catch(error => {
																console.log(error.toString());
																this.controls.enabled = false;

															});
													}
											});
									}

							},
							//マウスドラッグ中の回転値計算〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜
							onDocumentMove:function(e){
									e.preventDefault();

									performance.mark('DrugStart');
									this.DrugFunc(e);
									performance.mark('DrugEnd');

							},
							//マウスドロップ時〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜~~
							onDocumentUp:function(e){
									this.canvas.removeEventListener( this.eventmove, this.onDocumentMove, false );
									this.canvas.removeEventListener( this.eventend, this.onDocumentUp, false );
									selected_Pivot = 0;
									//更新後にupdate_setを初期化
									updates = {};

									flag_hol = 0;
									flag_sel = 0;

									//ドラッグ中のフラグを下げる
									flag_drug = false;

									console.log('ドロップ');
									this.controls.enabled = false;

							},
							//操作方法選択~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
							mode_change:function(e){
									if(this.controls.enabled == false){
											this.controls.enabled = true;
											this.canvas.addEventListener(this.eventstart, this.OrbitStart,{passive:false});
											this.canvas.removeEventListener(this.eventmove, this.handleMouseMove);
											this.canvas.removeEventListener(this.eventstart, this.grapObject, false);
											this.button_mes = "Edit Mode:Camera";
									}else if (this.controls.enabled == true) {
											this.controls.enabled = false;
											this.canvas.removeEventListener(this.eventstart, this.OrbitStart,{passive:false});
											this.canvas.addEventListener(this.eventmove, this.handleMouseMove);
											this.canvas.addEventListener(this.eventstart, this.grapObject, false);
											this.button_mes = "Edit Mode:Object";
									}

							},
							DrugFunc:function(e){

									if(e.clientX) {
										var touchClientX = e.clientX;
										var touchClientY = e.clientY;
									} else if(e.touches) {
										var touchClientX = e.touches[0].clientX
										var touchClientY = e.touches[0].clientY;
									} else {
										var touchClientX = e.changedTouches[0].clientX
										var touchClientY = e.changedTouches[0].clientY
									}
									lon = ( touchClientX - onMouseDownMouseX ) * 0.01 + onMouseDownLon;
									lat = ( touchClientY - onMouseDownMouseY ) * 0.01 + onMouseDownLat;

									//	firebaseDocument(https://firebase.google.com/docs/database/we
									//	b/read-and-write?hl=ja&authuser=0)の「完了コールバックの追加」を参照

									//任意フレーム内のアニメーションデータを更新~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
									//フレーム：bar_value,部位:selected_Pivot.name

									//選ばれた部位のキーフレームを持ってくる~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
									database.ref('/human_A/Motion/obj'+selected_Pivot.name).on('value',function(snap){
											//軸ごとのループを回す~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
											for(var j=0; j<3; j++){

													if(j == 0){
															var rot_name = "x";
															var selected_Pivot_times = snap.child(rot_name+'/times').val();
															var selected_Pivot_values = snap.child(rot_name+'/values').val();
													}else if (j == 1) {
															var rot_name = "y";
															var selected_Pivot_times = snap.child(rot_name+'/times').val();
															var selected_Pivot_values = snap.child(rot_name+'/values').val();
													}else if (j == 2) {
															var rot_name = "z";
															var selected_Pivot_times = snap.child(rot_name+'/times').val();
															var selected_Pivot_values = snap.child(rot_name+'/values').val();
													}

													//bar_valueの値と選ばれた部位のtimes配列の中身を全チェック~~~~~~~~~~~~
													for(var k = 0; k < selected_Pivot_times.length; k++){
															if(vm.$data.bar_value == selected_Pivot_times[k]){
																	//k番目の値とbar_valueが一致した時、
																	//index番号が変数kと等しいvaluesを現在の回転値で更新
																	if(rot_name == 'y'){
																				selected_Pivot_values[k] = lon;
																	}else if(rot_name == 'x'){
																				selected_Pivot_values[k] = lat;
																	}
																	updates["obj"+selected_Pivot.name+"/"+rot_name+"/values"] = selected_Pivot_values;

																	break;
															}else if(vm.$data.bar_value <　selected_Pivot_times[k]){
																	//k番目の値よりもbar_valueが小さくなった時、
																	//index番号が変数kの位置のtimes,valuesそれぞれにbar_value,現在の回転値を追加
																	//それ以後のindex番号を一つずつずらす
																	if(rot_name == 'y'){
																				selected_Pivot_times.splice(k,0,vm.$data.bar_value);
																				selected_Pivot_values.splice(k,0,lon);
																	}else if(rot_name == 'x'){
																				selected_Pivot_times.splice(k,0,vm.$data.bar_value);
																				selected_Pivot_values.splice(k,0,lat);
																	}
																	updates["obj"+selected_Pivot.name+"/"+rot_name+"/times"]	= selected_Pivot_times;
																	updates["obj"+selected_Pivot.name+"/"+rot_name+"/values"]	= selected_Pivot_values;

																	break;
															}else if(k == selected_Pivot_times.length - 1){
																	//times配列中にbar_valueと同じ、もしくはそれより大きい値が無かった時、
																	//最後尾にtimes,valuesそれぞれbar_value,現在の回転値を末尾に追加
																	if(rot_name == 'y'){
																				selected_Pivot_times.push(vm.$data.bar_value);
																				selected_Pivot_values.push(lon);
																	}else if(rot_name == 'x'){
																				selected_Pivot_times.push(vm.$data.bar_value);
																				selected_Pivot_values.push(lat);
																	}
																	updates["obj"+selected_Pivot.name+"/"+rot_name+"/times"] = selected_Pivot_times;
																	updates["obj"+selected_Pivot.name+"/"+rot_name+"/values"] = selected_Pivot_values;
																	break;
															}
													}
												}



									});
							}

					},
					mounted(){
							this.canvas = document.getElementById('canvas');
							this.canvas.appendChild(this.renderer.domElement);
							this.renderer.setPixelRatio(window.devicePixelRatio);
							this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
							this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
							this.camera.position.set(0, 400, 1000);
							this.camera.lookAt(new THREE.Vector3(0,0,0));
							//Orbitカメラの設定
							this.controls = new THREE.OrbitControls(this.camera, this.canvas);
							this.controls.target.set(0, 250, 0);
							this.controls.enableZoom = false;
							this.controls.enabled = false;


							//地面を作成
							const plane2 = new THREE.GridHelper(600);
							this.scene.add(plane2);
							const plane = new THREE.AxesHelper(300);
							this.scene.add(plane);


							//全てを包括するグループ(ここではhuman)
							this.human.name = "0000"


							//頭の生成(obj0001)~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
							const head_material = new THREE.MeshNormalMaterial();
							const head_geometry = new THREE.SphereGeometry(30,30,30);
							const head = new THREE.Mesh(head_geometry,head_material);
							head.position.set(
								0,
								parseFloat(fss.child('Object/obj0002/length').val()) + 35,
								0
							);
							//生成オブジェクトに対するid値(識別値)の反映
							const head_id =	fss.child('Panel/obj0001/id').val();
							head.name = head_id;
							//生成オブジェクトに対するPiv値(回転中心)の反映
							const head_group = new THREE.Group();
							head_group.name = head_id;
							head_group.position.set(
								parseFloat(fss.child('Panel/obj0001/Piv/x').val()),
								parseFloat(fss.child('Panel/obj0001/Piv/y').val()),
								parseFloat(fss.child('Panel/obj0001/Piv/z').val())
							);
							//生成オブジェクトに対するRot値(回転角)の反映
							head_group.rotation.set(
								parseFloat(fss.child('Panel/obj0001/Rot/x').val()),
								parseFloat(fss.child('Panel/obj0001/Rot/y').val()),
								parseFloat(fss.child('Panel/obj0001/Rot/z').val())
							);

							head_group.add(head);
							//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


							//体の生成(obj0002)
							const body_material = new THREE.MeshNormalMaterial();
							const body_geometry = new THREE.BoxGeometry(
								50,
								parseFloat(fss.child('Object/obj0002/length').val()),
								50
							);
							const body = new THREE.Mesh(body_geometry,body_material);
							body.position.set(
								0,
								parseFloat(fss.child('Object/obj0002/length').val()) / 2,
								0
							);
							const body_id = fss.child('Panel/obj0002/id').val();
							body.name = body_id;
							const body_group = new THREE.Group();
							body_group.name = body_id;
							body_group.position.set(
								parseFloat(fss.child('Panel/obj0002/Piv/x').val()),
								parseFloat(fss.child('Panel/obj0002/Piv/y').val()),
								parseFloat(fss.child('Panel/obj0002/Piv/z').val())
							);
							body_group.rotation.set(
								parseFloat(fss.child('Panel/obj0002/Rot/x').val()),
								parseFloat(fss.child('Panel/obj0002/Rot/y').val()),
								parseFloat(fss.child('Panel/obj0002/Rot/z').val())
							);
							body_group.add(body);
							//~~~~~~~~~~~~~~~~~~


							//右腕(obj0003,0004)

							const arm_material =  new THREE.MeshNormalMaterial();
							const right_arm_geometry1 = new THREE.BoxGeometry(
								parseFloat(fss.child('Object/obj0003/length').val()),
								15,
								15
							);
							const right_arm_1 = new THREE.Mesh( right_arm_geometry1, arm_material );
							right_arm_1.position.set(
								parseFloat(fss.child('Object/obj0003/length').val()) / 2 * (-1),
								0,
								0
							);
							const right_arm_1_id =	fss.child('Panel/obj0003/id').val();
							right_arm_1.name = right_arm_1_id;
							const right_arm_group = new THREE.Group();
							right_arm_group.name = right_arm_1_id;
							right_arm_group.position.set(
								parseFloat(fss.child('Panel/obj0003/Piv/x').val()),
								parseFloat(fss.child('Panel/obj0003/Piv/y').val()),
								parseFloat(fss.child('Panel/obj0003/Piv/z').val())
							);
							right_arm_group.rotation.set(
								parseFloat(fss.child('Panel/obj0003/Rot/x').val()),
								parseFloat(fss.child('Panel/obj0003/Rot/y').val()),
								parseFloat(fss.child('Panel/obj0003/Rot/z').val())
							);
							right_arm_group.add(right_arm_1);
							//~~~~~~~~~~~~~~~~~

							const right_arm_geometry2 = new THREE.BoxGeometry(
								parseFloat(fss.child('Object/obj0004/length').val()),
								15,
								15
							);
							const right_arm_2 = new THREE.Mesh( right_arm_geometry2, arm_material );
							right_arm_2.position.set(
								parseFloat(fss.child('Object/obj0004/length').val()) / 2 * (-1),
								0,
								0
							);
							const right_arm_2_id =	fss.child('Panel/obj0004/id').val();
							right_arm_2.name = right_arm_2_id;
							const right_arm_group2 = new THREE.Group();
							right_arm_group2.name = right_arm_2_id;
							right_arm_group2.position.set(
								parseFloat(fss.child('Panel/obj0004/Piv/x').val()),
								parseFloat(fss.child('Panel/obj0004/Piv/y').val()),
								parseFloat(fss.child('Panel/obj0004/Piv/z').val())
							);
							right_arm_group2.rotation.set(
								parseFloat(fss.child('Panel/obj0004/Rot/x').val()),
								parseFloat(fss.child('Panel/obj0004/Rot/y').val()),
								parseFloat(fss.child('Panel/obj0004/Rot/z').val())
							);
							right_arm_group2.add(right_arm_2);
							//~~~~~~~~~~~~~~~~~



							//左腕(obj0005,0006)

							const left_arm_geometry1 = new THREE.BoxGeometry(
								parseFloat(fss.child('Object/obj0005/length').val()),
								15,
								15
							);
							const left_arm_1 = new THREE.Mesh( left_arm_geometry1, arm_material );
							left_arm_1.position.set(
								parseFloat(fss.child('Object/obj0005/length').val()) / 2,
								0,
								0
							);
							const left_arm_1_id =	fss.child('Panel/obj0005/id').val();
							left_arm_1.name = left_arm_1_id;
							const left_arm_group = new THREE.Group();
							left_arm_group.name = left_arm_1_id;
							left_arm_group.position.set(
								parseFloat(fss.child('Panel/obj0005/Piv/x').val()),
								parseFloat(fss.child('Panel/obj0005/Piv/y').val()),
								parseFloat(fss.child('Panel/obj0005/Piv/z').val())
							);
							left_arm_group.rotation.set(
								parseFloat(fss.child('Panel/obj0005/Rot/x').val()),
								parseFloat(fss.child('Panel/obj0005/Rot/y').val()),
								parseFloat(fss.child('Panel/obj0005/Rot/z').val())
							);
							left_arm_group.add(left_arm_1);

							//~~~~~~~~~~~~~~~~~~~~~

							const left_arm_geometry2 = new THREE.BoxGeometry(
								parseFloat(fss.child('Object/obj0006/length').val()),
								15,
								15
							);
							const left_arm_2 = new THREE.Mesh( left_arm_geometry2, arm_material );
							left_arm_2.position.set(
								parseFloat(fss.child('Object/obj0006/length').val()) / 2,
								0,
								0
							);
							const left_arm_2_id = fss.child('Panel/obj0006/id').val();
							left_arm_2.name = left_arm_2_id;
							const left_arm_group2 = new THREE.Group();
							left_arm_group2.name = left_arm_2_id;
							left_arm_group2.position.set(
								parseFloat(fss.child('Panel/obj0006/Piv/x').val()),
								parseFloat(fss.child('Panel/obj0006/Piv/y').val()),
								parseFloat(fss.child('Panel/obj0006/Piv/z').val())
							);
							left_arm_group2.rotation.set(
								parseFloat(fss.child('Panel/obj0006/Rot/x').val()),
								parseFloat(fss.child('Panel/obj0006/Rot/y').val()),
								parseFloat(fss.child('Panel/obj0006/Rot/z').val())
							);
							left_arm_group2.add(left_arm_2);

							//~~~~~~~~~~~~~~~~~~~


							//腰(obj0007)
							const waist_geometry = new THREE.BoxGeometry(50,20,50);
							const waist = new THREE.Mesh(waist_geometry, body_material);
							const waist_id = fss.child('Panel/obj0007/id').val();
							waist.name = waist_id;
							const waist_group = new THREE.Group();
							waist_group.name = waist_id;
							waist_group.position.set(
								parseFloat(fss.child('Panel/obj0007/Piv/x').val()),
								parseFloat(fss.child('Panel/obj0007/Piv/y').val()),
								parseFloat(fss.child('Panel/obj0007/Piv/z').val())
							);
							waist_group.rotation.set(
								parseFloat(fss.child('Panel/obj0007/Rot/x').val()),
								parseFloat(fss.child('Panel/obj0007/Rot/y').val()),
								parseFloat(fss.child('Panel/obj0007/Rot/z').val())
							);
							waist_group.add(waist);
							//~~~~~~~~~~~~~~~~~~~~


							//右足(obj0008,0009)
							const foot_material =  new THREE.MeshNormalMaterial();
							const right_foot_geometry1 = new THREE.BoxGeometry(
								20,
								parseFloat(fss.child('Object/obj0008/length').val()),
								20
							);
							const right_foot_1 = new THREE.Mesh( right_foot_geometry1, foot_material );
							right_foot_1.position.set(
								0,
								parseFloat(fss.child('Object/obj0008/length').val()) / 2 * (-1),
								0
							);
							const right_foot_1_id =	fss.child('Panel/obj0008/id').val();
							right_foot_1.name = right_foot_1_id;
							const right_foot_group = new THREE.Group();
							right_foot_group.name = right_foot_1_id;
							right_foot_group.position.set(
								parseFloat(fss.child('Panel/obj0008/Piv/x').val()),
								parseFloat(fss.child('Panel/obj0008/Piv/y').val()),
								parseFloat(fss.child('Panel/obj0008/Piv/z').val())
							);
							right_foot_group.rotation.set(
								parseFloat(fss.child('Panel/obj0008/Rot/x').val()),
								parseFloat(fss.child('Panel/obj0008/Rot/y').val()),
								parseFloat(fss.child('Panel/obj0008/Rot/z').val())
							);
							right_foot_group.add(right_foot_1);

							//~~~~~~~~~~~~~~
							const right_foot_geometry2 = new THREE.BoxGeometry(
								20,
								parseFloat(fss.child('Object/obj0009/length').val()),
								20
							);
							const right_foot_2 = new THREE.Mesh( right_foot_geometry2, foot_material );
							right_foot_2.position.set(
								0,
								parseFloat(fss.child('Object/obj0009/length').val()) / 2 * (-1),
								0
							);
							const right_foot_2_id =	fss.child('Panel/obj0009/id').val();
							right_foot_2.name = right_foot_2_id;
							const right_foot_group2 = new THREE.Group();
							right_foot_group2.name = right_foot_2_id;
							right_foot_group2.position.set(
								parseFloat(fss.child('Panel/obj0009/Piv/x').val()),
								parseFloat(fss.child('Panel/obj0009/Piv/y').val()),
								parseFloat(fss.child('Panel/obj0009/Piv/z').val())
							);
							right_foot_group2.rotation.set(
								parseFloat(fss.child('Panel/obj0009/Rot/x').val()),
								parseFloat(fss.child('Panel/obj0009/Rot/y').val()),
								parseFloat(fss.child('Panel/obj0009/Rot/z').val())
							);
							right_foot_group2.add(right_foot_2);

							//~~~~~~~~~~~~~~


							//左足(obj0010,0011)

							const left_foot_geometry1 = new THREE.BoxGeometry(
								20,
								parseFloat(fss.child('Object/obj0010/length').val()),
								20
							);
							const left_foot_1 = new THREE.Mesh( left_foot_geometry1, foot_material );
							left_foot_1.position.set(
								0,
								parseFloat(fss.child('Object/obj0010/length').val()) / 2 * (-1),
								0
							);
							const left_foot_1_id =	fss.child('Panel/obj0010/id').val();
							left_foot_1.name = left_foot_1_id;
							const left_foot_group = new THREE.Group();
							left_foot_group.name = left_foot_1_id;
							left_foot_group.position.set(
								parseFloat(fss.child('Panel/obj0010/Piv/x').val()),
								parseFloat(fss.child('Panel/obj0010/Piv/y').val()),
								parseFloat(fss.child('Panel/obj0010/Piv/z').val())
							);
							left_foot_group.rotation.set(
								parseFloat(fss.child('Panel/obj0010/Rot/x').val()),
								parseFloat(fss.child('Panel/obj0010/Rot/y').val()),
								parseFloat(fss.child('Panel/obj0010/Rot/z').val())
							);
							left_foot_group.add(left_foot_1);

							//~~~~~~~~~~~~~

							const left_foot_geometry2 = new THREE.BoxGeometry(
								20,
								parseFloat(fss.child('Object/obj0011/length').val()),
								20
							);
							const left_foot_2 = new THREE.Mesh( left_foot_geometry2, foot_material );
							left_foot_2.position.set(
								0,
								parseFloat(fss.child('Object/obj0011/length').val()) / 2 * (-1),
								0
							);
							const left_foot_2_id =	fss.child('Panel/obj0011/id').val();
							left_foot_2.name = left_foot_2_id;
							const left_foot_group2 = new THREE.Group();
							left_foot_group2.name = left_foot_2_id;
							left_foot_group2.position.set(
								parseFloat(fss.child('Panel/obj0011/Piv/x').val()),
								parseFloat(fss.child('Panel/obj0011/Piv/y').val()),
								parseFloat(fss.child('Panel/obj0011/Piv/z').val())
							);
							left_foot_group2.rotation.set(
								parseFloat(fss.child('Panel/obj0011/Rot/x').val()),
								parseFloat(fss.child('Panel/obj0011/Rot/y').val()),
								parseFloat(fss.child('Panel/obj0011/Rot/z').val())
							);
							left_foot_group2.add(left_foot_2);

							//~~~~~~~~~~~~~~


							//レイキャスター利用のため、リストに保存
							this.MeshList.push(body);
							this.MeshList.push(head);
							this.MeshList.push(waist);
							this.MeshList.push(right_arm_1);
							this.MeshList.push(right_arm_2);
							this.MeshList.push(left_arm_1);
							this.MeshList.push(left_arm_2);
							this.MeshList.push(right_foot_1);
							this.MeshList.push(right_foot_2);
							this.MeshList.push(left_foot_1);
							this.MeshList.push(left_foot_2);

							this.PivotList.push(this.human);
							this.PivotList.push(body_group);
							this.PivotList.push(head_group);
							this.PivotList.push(waist_group);
							this.PivotList.push(right_arm_group);
							this.PivotList.push(right_arm_group2);
							this.PivotList.push(left_arm_group);
							this.PivotList.push(left_arm_group2);
							this.PivotList.push(right_foot_group);
							this.PivotList.push(right_foot_group2);
							this.PivotList.push(left_foot_group);
							this.PivotList.push(left_foot_group2);

							//ここで作るIDListは、データベースで作ったものから
							//読み込む形に変える。
							//先頭はhumanグループのID。
							this.IdList.push("0000");//human
							this.IdList.push("0001");//head
							this.IdList.push("0002");//body
							this.IdList.push("0003");
							this.IdList.push("0004");
							this.IdList.push("0005");
							this.IdList.push("0006");
							this.IdList.push("0007");//waist
							this.IdList.push("0008");
							this.IdList.push("0009");
							this.IdList.push("0010");
							this.IdList.push("0011");



							//リストの生成を待ってから接合処理を行う~~~~~~~~~~~~~~~~~~~~~
							setTimeout(function(){

										//接合処理~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
										//ピボットリストを基に、conectIDを検索~~~~~~~~~~~

										//forEach内のthisは繰り返す配列を指すため
										//vm.$data等を使ってケアする必要がある！
										this.IdList.forEach(function(id,index){

												if(index != 0){			//humanグループを省く

															const conectID = fss.child("Panel/obj" + id + "/conect").val();

															vm.$data.PivotList.forEach(function(pivo,index){
																		if( pivo.name == id ){
																				IDson	=	index;
																		}
																		if( pivo.name == conectID ){
																				IDparent	= index;
																		}
															});

															vm.$data.PivotList[IDparent].add(vm.$data.PivotList[IDson]);


												}

										});
										//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


										//これより以下でAnimationデータの生成~~~~~~~~~~~~~
										var rotationKeyframeTrackJSON_Body_x = {
											//			0002.rotation[x]
											name:		this.PivotList[1].name+".rotation[x]",
											type: 	"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_Body_y = {
											name:		this.PivotList[1].name+".rotation[y]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_Body_z = {
											name:		this.PivotList[1].name+".rotation[z]",
											type:		"number",
											times:	[0],
											values:	[0]
										};

										var rotationKeyframeTrackJSON_RightArm1_x = {
											//			0002/0003.rotation[x]
											name:		this.PivotList[1].name+"/"+this.PivotList[4].name+".rotation[x]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_RightArm1_y = {
											name:		this.PivotList[1].name+"/"+this.PivotList[4].name+".rotation[y]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_RightArm1_z = {
											name:		this.PivotList[1].name+"/"+this.PivotList[4].name+".rotation[z]",
											type:		"number",
											times:	[0],
											values:	[0]
										};

										var rotationKeyframeTrackJSON_RightArm2_x = {
											//			0002/0003/0004.rotation[x]
											name:		this.PivotList[1].name+"/"+this.PivotList[4].name+"/"+this.PivotList[5].name+".rotation[x]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_RightArm2_y = {
											name:		this.PivotList[1].name+"/"+this.PivotList[4].name+"/"+this.PivotList[5].name+".rotation[y]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_RightArm2_z = {
											name:		this.PivotList[1].name+"/"+this.PivotList[4].name+"/"+this.PivotList[5].name+".rotation[z]",
											type:		"number",
											times:	[0],
											values:	[0]
										};

										var rotationKeyframeTrackJSON_LeftArm1_x = {
											//			0002/0005.rotation[x]
											name:		this.PivotList[1].name+"/"+this.PivotList[6].name+".rotation[x]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_LeftArm1_y = {
											name:		this.PivotList[1].name+"/"+this.PivotList[6].name+".rotation[y]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_LeftArm1_z = {
											name:		this.PivotList[1].name+"/"+this.PivotList[6].name+".rotation[z]",
											type:		"number",
											times:	[0],
											values:	[0]
										};

										var rotationKeyframeTrackJSON_LeftArm2_x = {
											//			0002/0005/0006.rotation[x]
											name:		this.PivotList[1].name+"/"+this.PivotList[6].name+"/"+this.PivotList[7].name+".rotation[x]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_LeftArm2_y = {
											name:		this.PivotList[1].name+"/"+this.PivotList[6].name+"/"+this.PivotList[7].name+".rotation[y]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_LeftArm2_z = {
											name:		this.PivotList[1].name+"/"+this.PivotList[6].name+"/"+this.PivotList[7].name+".rotation[z]",
											type:		"number",
											times:	[0],
											values:	[0]
										};

										var rotationKeyframeTrackJSON_Waist_x = {
											//			0007.rotation[x]
											name:		this.PivotList[3].name+".rotation[x]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_Waist_y = {
											name:		this.PivotList[3].name+".rotation[y]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_Waist_z = {
											name:		this.PivotList[3].name+".rotation[z]",
											type:		"number",
											times:	[0],
											values:	[0]
										};

										var rotationKeyframeTrackJSON_RightFoot1_x = {
											//			0007/0008.rotation[x]
											name:		this.PivotList[3].name+"/"+this.PivotList[8].name+".rotation[x]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_RightFoot1_y = {
											name:		this.PivotList[3].name+"/"+this.PivotList[8].name+".rotation[y]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_RightFoot1_z = {
											name:		this.PivotList[3].name+"/"+this.PivotList[8].name+".rotation[z]",
											type:		"number",
											times:	[0],
											values:	[0]
										};

										var rotationKeyframeTrackJSON_RightFoot2_x = {
											//			0007/0008/0009.rotation[x]
											name:		this.PivotList[3].name+"/"+this.PivotList[8].name+"/"+this.PivotList[9].name+".rotation[x]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_RightFoot2_y = {
											name:		this.PivotList[3].name+"/"+this.PivotList[8].name+"/"+this.PivotList[9].name+".rotation[y]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_RightFoot2_z = {
											name:		this.PivotList[3].name+"/"+this.PivotList[8].name+"/"+this.PivotList[9].name+".rotation[z]",
											type:		"number",
											times:	[0],
											values:	[0]
										};

										var rotationKeyframeTrackJSON_LeftFoot1_x = {
											//			0007/0010.rotation[x]
											name:		this.PivotList[3].name+"/"+this.PivotList[10].name+".rotation[x]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_LeftFoot1_y = {
											name:		this.PivotList[3].name+"/"+this.PivotList[10].name+".rotation[y]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_LeftFoot1_z = {
											name:		this.PivotList[3].name+"/"+this.PivotList[10].name+".rotation[z]",
											type:		"number",
											times:	[0],
											values:	[0]
										};

										var rotationKeyframeTrackJSON_LeftFoot2_x = {
											//			0007/0010/0011.rotation[x]
											name:		this.PivotList[3].name+"/"+this.PivotList[10].name+"/"+this.PivotList[11].name+".rotation[x]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_LeftFoot2_y = {
											name:		this.PivotList[3].name+"/"+this.PivotList[10].name+"/"+this.PivotList[11].name+".rotation[y]",
											type:		"number",
											times:	[0],
											values:	[0]
										};
										var rotationKeyframeTrackJSON_LeftFoot2_z = {
											name:		this.PivotList[3].name+"/"+this.PivotList[10].name+"/"+this.PivotList[11].name+".rotation[z]",
											type:		"number",
											times:	[0],
											values:	[0]
										};



										this.keyframetracks.push(rotationKeyframeTrackJSON_Body_x);
										this.keyframetracks.push(rotationKeyframeTrackJSON_Body_y);
										this.keyframetracks.push(rotationKeyframeTrackJSON_Body_z);
										this.keyframetracks.push(rotationKeyframeTrackJSON_RightArm1_x);
										this.keyframetracks.push(rotationKeyframeTrackJSON_RightArm1_y);
										this.keyframetracks.push(rotationKeyframeTrackJSON_RightArm1_z);
										this.keyframetracks.push(rotationKeyframeTrackJSON_RightArm2_x);
										this.keyframetracks.push(rotationKeyframeTrackJSON_RightArm2_y);
										this.keyframetracks.push(rotationKeyframeTrackJSON_RightArm2_z);
										this.keyframetracks.push(rotationKeyframeTrackJSON_LeftArm1_x);
										this.keyframetracks.push(rotationKeyframeTrackJSON_LeftArm1_y);
										this.keyframetracks.push(rotationKeyframeTrackJSON_LeftArm1_z);
										this.keyframetracks.push(rotationKeyframeTrackJSON_LeftArm2_x);
										this.keyframetracks.push(rotationKeyframeTrackJSON_LeftArm2_y);
										this.keyframetracks.push(rotationKeyframeTrackJSON_LeftArm2_z);
										this.keyframetracks.push(rotationKeyframeTrackJSON_Waist_x);
										this.keyframetracks.push(rotationKeyframeTrackJSON_Waist_y);
										this.keyframetracks.push(rotationKeyframeTrackJSON_Waist_z);
										this.keyframetracks.push(rotationKeyframeTrackJSON_RightFoot1_x);
										this.keyframetracks.push(rotationKeyframeTrackJSON_RightFoot1_y);
										this.keyframetracks.push(rotationKeyframeTrackJSON_RightFoot1_z);
										this.keyframetracks.push(rotationKeyframeTrackJSON_RightFoot2_x);
										this.keyframetracks.push(rotationKeyframeTrackJSON_RightFoot2_y);
										this.keyframetracks.push(rotationKeyframeTrackJSON_RightFoot2_z);
										this.keyframetracks.push(rotationKeyframeTrackJSON_LeftFoot1_x);
										this.keyframetracks.push(rotationKeyframeTrackJSON_LeftFoot1_y);
										this.keyframetracks.push(rotationKeyframeTrackJSON_LeftFoot1_z);
										this.keyframetracks.push(rotationKeyframeTrackJSON_LeftFoot2_x);
										this.keyframetracks.push(rotationKeyframeTrackJSON_LeftFoot2_y);
										this.keyframetracks.push(rotationKeyframeTrackJSON_LeftFoot2_z);
										//keyframetracksは30個


										//スナップショットからデータを取得
										this.keyframetracks[0].times = fss.child('Motion/obj0002/x/times').val();
										this.keyframetracks[0].values = fss.child('Motion/obj0002/x/values').val();
										this.keyframetracks[1].times = fss.child('Motion/obj0002/y/times').val();
										this.keyframetracks[1].values = fss.child('Motion/obj0002/y/values').val();
										this.keyframetracks[2].times = fss.child('Motion/obj0002/z/times').val();
										this.keyframetracks[2].values = fss.child('Motion/obj0002/z/values').val();

										this.keyframetracks[3].times = fss.child('Motion/obj0003/x/times').val();
										this.keyframetracks[3].values = fss.child('Motion/obj0003/x/values').val();
										this.keyframetracks[4].times = fss.child('Motion/obj0003/y/times').val();
										this.keyframetracks[4].values = fss.child('Motion/obj0003/y/values').val();
										this.keyframetracks[5].times = fss.child('Motion/obj0003/z/times').val();
										this.keyframetracks[5].values = fss.child('Motion/obj0003/z/values').val();

										this.keyframetracks[6].times = fss.child('Motion/obj0004/x/times').val();
										this.keyframetracks[6].values = fss.child('Motion/obj0004/x/values').val();
										this.keyframetracks[7].times = fss.child('Motion/obj0004/y/times').val();
										this.keyframetracks[7].values = fss.child('Motion/obj0004/y/values').val();
										this.keyframetracks[8].times = fss.child('Motion/obj0004/z/times').val();
										this.keyframetracks[8].values = fss.child('Motion/obj0004/z/values').val();

										this.keyframetracks[9].times = fss.child('Motion/obj0005/x/times').val();
										this.keyframetracks[9].values = fss.child('Motion/obj0005/x/values').val();
										this.keyframetracks[10].times = fss.child('Motion/obj0005/y/times').val();
										this.keyframetracks[10].values = fss.child('Motion/obj0005/y/values').val();
										this.keyframetracks[11].times = fss.child('Motion/obj0005/z/times').val();
										this.keyframetracks[11].values = fss.child('Motion/obj0005/z/values').val();

										this.keyframetracks[12].times = fss.child('Motion/obj0006/x/times').val();
										this.keyframetracks[12].values = fss.child('Motion/obj0006/x/values').val();
										this.keyframetracks[13].times = fss.child('Motion/obj0006/y/times').val();
										this.keyframetracks[13].values = fss.child('Motion/obj0006/y/values').val();
										this.keyframetracks[14].times = fss.child('Motion/obj0006/z/times').val();
										this.keyframetracks[14].values = fss.child('Motion/obj0006/z/values').val();

										this.keyframetracks[15].times = fss.child('Motion/obj0007/x/times').val();
										this.keyframetracks[15].values = fss.child('Motion/obj0007/x/values').val();
										this.keyframetracks[16].times = fss.child('Motion/obj0007/y/times').val();
										this.keyframetracks[16].values = fss.child('Motion/obj0007/y/values').val();
										this.keyframetracks[17].times = fss.child('Motion/obj0007/z/times').val();
										this.keyframetracks[17].values = fss.child('Motion/obj0007/z/values').val();

										this.keyframetracks[18].times = fss.child('Motion/obj0008/x/times').val();
										this.keyframetracks[18].values = fss.child('Motion/obj0008/x/values').val();
										this.keyframetracks[19].times = fss.child('Motion/obj0008/y/times').val();
										this.keyframetracks[19].values = fss.child('Motion/obj0008/y/values').val();
										this.keyframetracks[20].times = fss.child('Motion/obj0008/z/times').val();
										this.keyframetracks[20].values = fss.child('Motion/obj0008/z/values').val();

										this.keyframetracks[21].times = fss.child('Motion/obj0009/x/times').val();
										this.keyframetracks[21].values = fss.child('Motion/obj0009/x/values').val();
										this.keyframetracks[22].times = fss.child('Motion/obj0009/y/times').val();
										this.keyframetracks[22].values = fss.child('Motion/obj0009/y/values').val();
										this.keyframetracks[23].times = fss.child('Motion/obj0009/z/times').val();
										this.keyframetracks[23].values = fss.child('Motion/obj0009/z/values').val();

										this.keyframetracks[24].times = fss.child('Motion/obj0010/x/times').val();
										this.keyframetracks[24].values = fss.child('Motion/obj0010/x/values').val();
										this.keyframetracks[25].times = fss.child('Motion/obj0010/y/times').val();
										this.keyframetracks[25].values = fss.child('Motion/obj0010/y/values').val();
										this.keyframetracks[26].times = fss.child('Motion/obj0010/z/times').val();
										this.keyframetracks[26].values = fss.child('Motion/obj0010/z/values').val();

										this.keyframetracks[27].times = fss.child('Motion/obj0011/x/times').val();
										this.keyframetracks[27].values = fss.child('Motion/obj0011/x/values').val();
										this.keyframetracks[28].times = fss.child('Motion/obj0011/y/times').val();
										this.keyframetracks[28].values = fss.child('Motion/obj0011/y/values').val();
										this.keyframetracks[29].times = fss.child('Motion/obj0011/z/times').val();
										this.keyframetracks[29].values = fss.child('Motion/obj0011/z/values').val();




										var clipJSON_Human = {
											duration: 4,
											name:"human_animation",
											tracks: [
												this.keyframetracks[0],
												this.keyframetracks[1],
												this.keyframetracks[2],

												this.keyframetracks[15],
												this.keyframetracks[16],
												this.keyframetracks[17],

												this.keyframetracks[3],
												this.keyframetracks[4],
												this.keyframetracks[5],

												this.keyframetracks[6],
												this.keyframetracks[7],
												this.keyframetracks[8],

												this.keyframetracks[9],
												this.keyframetracks[10],
												this.keyframetracks[11],

												this.keyframetracks[12],
												this.keyframetracks[13],
												this.keyframetracks[14],

												this.keyframetracks[18],
												this.keyframetracks[19],
												this.keyframetracks[20],

												this.keyframetracks[21],
												this.keyframetracks[22],
												this.keyframetracks[23],

												this.keyframetracks[24],
												this.keyframetracks[25],
												this.keyframetracks[26],

												this.keyframetracks[27],
												this.keyframetracks[28],
												this.keyframetracks[29]
											]
										};

										var clip_all = THREE.AnimationClip.parse(clipJSON_Human);

										this.clips.push(clip_all);

										//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~



										setTimeout(function(){
												//接合処理の後にクローン生成~~~~~~~~~~~~~~~~~~~~~~~~
												this.human_clone = this.PivotList[0].clone();

												//その後の処理~~~~~~
												var all_mixer = new THREE.AnimationMixer(this.human_clone);

												this.mixers.push(all_mixer);

												var all_action = this.mixers[0].clipAction(this.clips[0]);

												this.actions.push(all_action);
												this.actions[0].setLoop(THREE.LoopOnce);
												this.actions[0].play();
												//~~~~~~~~~~~~~~~

												setTimeout(function(){
														this.actions[0].time = 0;
														this.mixers[0].time = 0;
														this.mixers[0].update(0);

														//体の回転
														this.PivotList[0].children[0].rotation.set(
																this.human_clone.children[0].rotation.x,
																this.human_clone.children[0].rotation.y,
																this.human_clone.children[0].rotation.z
														);
														//右上腕の回転
														this.PivotList[0].children[0].children[2].rotation.set(
																this.human_clone.children[0].children[2].rotation.x,
																this.human_clone.children[0].children[2].rotation.y,
																this.human_clone.children[0].children[2].rotation.z
														);
														//右前腕の回転
														this.PivotList[0].children[0].children[2].children[1].rotation.set(
																this.human_clone.children[0].children[2].children[1].rotation.x,
																this.human_clone.children[0].children[2].children[1].rotation.y,
																this.human_clone.children[0].children[2].children[1].rotation.z
														);
														//左上腕の回転
														this.PivotList[0].children[0].children[3].rotation.set(
																this.human_clone.children[0].children[3].rotation.x,
																this.human_clone.children[0].children[3].rotation.y,
																this.human_clone.children[0].children[3].rotation.z
														);
														//左前腕の回転
														this.PivotList[0].children[0].children[3].children[1].rotation.set(
																this.human_clone.children[0].children[3].children[1].rotation.x,
																this.human_clone.children[0].children[3].children[1].rotation.y,
																this.human_clone.children[0].children[3].children[1].rotation.z
														);
														//腰の回転
														this.PivotList[0].children[1].rotation.set(
																this.human_clone.children[1].rotation.x,
																this.human_clone.children[1].rotation.y,
																this.human_clone.children[1].rotation.z
														);
														//右大腿の回転
														this.PivotList[0].children[1].children[1].rotation.set(
																this.human_clone.children[1].children[1].rotation.x,
																this.human_clone.children[1].children[1].rotation.y,
																this.human_clone.children[1].children[1].rotation.z
														);
														//右下腿の回転
														this.PivotList[0].children[1].children[1].children[1].rotation.set(
																this.human_clone.children[1].children[1].children[1].rotation.x,
																this.human_clone.children[1].children[1].children[1].rotation.y,
																this.human_clone.children[1].children[1].children[1].rotation.z
														);
														//左大腿の回転
														this.PivotList[0].children[1].children[2].rotation.set(
																this.human_clone.children[1].children[2].rotation.x,
																this.human_clone.children[1].children[2].rotation.y,
																this.human_clone.children[1].children[2].rotation.z
														);
														//左下腿の回転
														this.PivotList[0].children[1].children[2].children[1].rotation.set(
																this.human_clone.children[1].children[2].children[1].rotation.x,
																this.human_clone.children[1].children[2].children[1].rotation.y,
																this.human_clone.children[1].children[2].children[1].rotation.z
														);



														this.scene.add(this.PivotList[0]);
														//animationテスト用
														//this.scene.add(this.human_clone);

														this.controls.update();
														this.renderer.render(this.scene, this.camera);

														this.canvas.addEventListener(this.eventmove, this.handleMouseMove);
														this.canvas.addEventListener(this.eventstart, this.grapObject, false);

														spinner.classList.add('loaded');

														//animationテスト用
														//this.animate();

												}.bind(this),100);

										}.bind(this),1000);

							}.bind(this),1000);
							//Vue内ではsetTimeoutにbind(this)をつける~~~~~~~~~~~~~~~~~~~~~
					}
			});
	};


	function waitRTDBload() {

			//初回読み込み時
			//get()で一回読み取り

			database.ref('/human_A').get().then((snapshot) => {
					createV(snapshot);
			});

			//更新検知時

			database.ref('/human_A/Motion').on('child_changed',function(snapshot){
					//変更された部位のMotionデータが返ってくる
					vm.changed_DB_bySomeone(snapshot);

			});

	};

	waitRTDBload();
	
}
