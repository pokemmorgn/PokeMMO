createAnimations() {
  const anims = this.scene.anims;
  // BAS : frames 0,1,2
  if (!anims.exists('walk_down')) {
    anims.create({
      key: 'walk_down',
      frames: anims.generateFrameNumbers('BoyWalk', { start: 0, end: 2 }),
      frameRate: 8,
      repeat: -1,
    });
  }
  // GAUCHE : frames 3,4,5
  if (!anims.exists('walk_left')) {
    anims.create({
      key: 'walk_left',
      frames: anims.generateFrameNumbers('BoyWalk', { start: 3, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
  }
  // DROITE : frames 6,7,8
  if (!anims.exists('walk_right')) {
    anims.create({
      key: 'walk_right',
      frames: anims.generateFrameNumbers('BoyWalk', { start: 6, end: 8 }),
      frameRate: 8,
      repeat: -1,
    });
  }
  // HAUT : frames 9,10,11
  if (!anims.exists('walk_up')) {
    anims.create({
      key: 'walk_up',
      frames: anims.generateFrameNumbers('BoyWalk', { start: 9, end: 11 }),
      frameRate: 8,
      repeat: -1,
    });
  }
  // IDLE
  if (!anims.exists('idle_down')) {
    anims.create({
      key: 'idle_down',
      frames: [{ key: 'BoyWalk', frame: 1 }],
      frameRate: 1,
      repeat: 0,
    });
  }
  if (!anims.exists('idle_left')) {
    anims.create({
      key: 'idle_left',
      frames: [{ key: 'BoyWalk', frame: 4 }],
      frameRate: 1,
      repeat: 0,
    });
  }
  if (!anims.exists('idle_right')) {
    anims.create({
      key: 'idle_right',
      frames: [{ key: 'BoyWalk', frame: 7 }],
      frameRate: 1,
      repeat: 0,
    });
  }
  if (!anims.exists('idle_up')) {
    anims.create({
      key: 'idle_up',
      frames: [{ key: 'BoyWalk', frame: 10 }],
      frameRate: 1,
      repeat: 0,
    });
  }
  console.log("🎞️ Animations BoyWalk créées (3x4, bas-gauche-droite-haut)");
}
