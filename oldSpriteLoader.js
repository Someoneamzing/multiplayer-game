GAME.spriteSheet.ready = false;
		GAME.spriteSheet.onload = GAME.setAssetReady;
		GAME.spriteSheet.src='/client/img/sprites.png';
		GAME.preloadPoll = setInterval(function(){
			if (GAME.spriteSheet.ready) {
				clearInterval(GAME.preloadPoll);
				Sprites.player = Sprite({
					name: "player",
					id: 0,
					width: 16,
					height: 16,
					image: GAME.spriteSheet,
					frameTime: 1,
					loop: false
				});
				GAME.background.ready = false;
				GAME.background.onload = GAME.setAssetReady;
				GAME.background.src = "/client/img/background.png";
				GAME.preloadPoll = setInterval(function(){
					if (GAME.spriteSheet.ready) {
						clearInterval(GAME.preloadPoll);
						Sprites.background = Sprite({
							name: "background",
							id: 1,
							width: 1920,
							height: 1080,
							image: GAME.background,
							frameTime: 1,
							loop: false
						});
						GAME.bulletSprite.ready = false;
						GAME.bulletSprite.onload = GAME.setAssetReady;
						GAME.bulletSprite.src = "/client/img/bullet.png";
						GAME.preloadPoll = setInterval(function(){
							if (GAME.bulletSprite.ready) {
								clearInterval(GAME.preloadPoll);
								Sprites.bullet = Sprite({
									name: "bullet",
									id: 2,
									width: 16,
									height: 16,
									image: GAME.bulletSprite,
									frameTime: 1,
									loop: false
								});
							}
						},1000/30);
					};
				},1000/30);
			}
		},1000/30);
