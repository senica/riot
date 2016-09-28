<prevent-unmount>
  <p onclick={ changeNameSilently }>click me</p>
  <p ref="fancy-name">{ name }</p>

  this.name = 'john'
  this.on('before-unmount', function(e){
    e.preventDefault = (this.name == 'john')
  });
  changeNameSilently() {
    this.name = 'mark'
  }
</prevent-unmount>
