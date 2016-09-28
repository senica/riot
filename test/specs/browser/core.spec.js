import {
  injectHTML,
  $,
  $$,
  IE_VERSION,
  normalizeHTML,
  fireEvent,
  getCarrotPos,
  setCarrotPos
} from '../../helpers/index'

// include special tags to test specific features
import '../../tag/v-dom-1.tag'
import '../../tag/v-dom-2.tag'
import '../../tag/timetable.tag'
import '../../tag/nested-child.tag'
import '../../tag/top-attributes.tag'
import '../../tag/preserve-attr.tag'
import '../../tag/svg-attr.tag'
import '../../tag/named-child.tag'
import '../../tag/deferred-mount.tag'
import '../../tag/deferred-unmount.tag'
import '../../tag/prevent-update.tag'
import '../../tag/prevent-unmount.tag'
import '../../tag/expression-eval-count.tag'
import '../../tag/multi-named.tag'
import '../../tag/named-data-ref.tag'
import '../../tag/input-number.tag'
import '../../tag/input-values.tag'
import '../../tag/nested-riot.tag'
import '../../tag/treeview.tag'
import '../../tag/events.tag'
import '../../tag/runtime-event-listener-switch.tag'
import '../../tag/should-update.tag'
import '../../tag/observable-attr.tag'
import '../../tag/virtual-nested-unmount.tag'
import '../../tag/form-controls.tag'
import '../../tag/data-is.tag'
import '../../tag/virtual-nested-component.tag'
import '../../tag/dynamic-data-is.tag'

const expect = chai.expect,
  defaultBrackets = riot.settings.brackets

describe('Riot core', function() {
  it('Riot exists', function () {
    expect(riot).to.be.not.undefined
  })

  afterEach(function() {
    riot.settings.brackets = defaultBrackets
  })

  before(function() {
    // general tag
    riot.tag('test', '<p>val: { opts.val }<\/p>')
  })

  it('populates the vdom property correctly on riot global', function() {
    injectHTML('<v-dom-1></v-dom-1>')
    injectHTML('<v-dom-2></v-dom-2>')
    var tags = riot.mount('v-dom-1, v-dom-2')

    expect(tags.length).to.be.equal(2)
    expect(riot.util.vdom).to.have.length(tags.length)
    riot.util.vdom.forEach(function(tag, i) {
      expect(tag).to.be.equal(tags[i])
    })
    tags.forEach(tag => tag.unmount())
  })

  it('riot can be extended', function() {
    riot.route = function() {}

    expect(riot.route).to.be.a('function')

    riot.util.tmpl.errorHandle = function() {}

    expect(riot.util.tmpl.errorHandle).to.be.a('function')
  })

  it('mount and unmount', function() {

    injectHTML([
      '<test id="test-tag"></test>',
      '<div id="foo"></div>',
      '<div id="bar"></div>'
    ])

    var tag = riot.mount('test', { val: 10 })[0],
      tag2 = riot.mount('#foo', 'test', { val: 30 })[0],
      tag3 = riot.mount(document.getElementById('bar'), 'test', { val: 50 })[0]

    expect(normalizeHTML(tag.root.innerHTML)).to.be.equal('<p>val: 10</p>')
    expect(normalizeHTML(tag2.root.innerHTML)).to.be.equal('<p>val: 30</p>')
    expect(normalizeHTML(tag3.root.innerHTML)).to.be.equal('<p>val: 50</p>')

    tag.unmount()
    tag2.unmount()
    tag3.unmount(true)

    expect(tag3.isMounted).to.be.equal(false)

    expect(document.body.getElementsByTagName('test').length).to.be.equal(0)
    expect(document.getElementById('foo')).to.be.equal(null)
    expect(document.getElementById('bar')).to.not.be.equal(null)

    expect(tag.root._tag).to.be.equal(undefined)
    expect(tag2.root._tag).to.be.equal(undefined)
    expect(tag3.root._tag).to.be.equal(undefined)

  })

  it('mount a tag mutiple times', function() {

    injectHTML([
       // mount the same tag multiple times
      '<div id="multi-mount-container-1"></div>'

    ])

    var tag = riot.mount('#multi-mount-container-1', 'test', { val: 300 })[0]

    expect(normalizeHTML(tag.root.innerHTML)).to.be.equal('<p>val: 300</p>')

    riot.tag('test-h', '<p>{ x }</p>', function() { this.x = 'ok'})

    tag = riot.mount('#multi-mount-container-1', 'test-h')[0]

    expect(normalizeHTML(tag.root.innerHTML)).to.be.equal('<p>ok</p>')

    tag.unmount()

  })

  it('compiles and unmount the children tags', function(done) {

    injectHTML('<timetable></timetable>')

    this.timeout(5000)

    var ticks = 0,
      tag = riot.mount('timetable', {
        start: 0,
        ontick: function() {
          ticks++
        }
      })[0]

    expect($$('timer', tag.root).length).to.be.equal(3)

    riot.update()

    expect(tag.tags.foo).to.not.be.equal(undefined)

    tag.unmount()

    // no time neither for one tick
    // because the tag got unMounted too early
    setTimeout(function() {
      expect(ticks).to.be.equal(0)
      done()
    }, 1200)

  })

  it('mount a tag mutiple times using "*"', function() {

    injectHTML([
      // multple mount using *
      '<div id="multi-mount-container-2">',
      '    <test-i></test-i>',
      '    <test-l></test-l>',
      '    <test-m></test-m>',
      '<\/div>'
    ])

    riot.tag('test-i', '<p>{ x }</p>', function() { this.x = 'ok'})
    riot.tag('test-l', '<p>{ x }</p>', function() { this.x = 'ok'})
    riot.tag('test-m', '<p>{ x }</p>', function() { this.x = 'ok'})

    var subTags = riot.mount('#multi-mount-container-2', '*')

    expect(subTags.length).to.be.equal(3)

    subTags = riot.mount(document.getElementById('multi-mount-container-2'), '*')

    expect(subTags.length).to.be.equal(3)

    subTags.forEach(tag => tag.unmount())

  })

  it('the mount method could be triggered also on several tags using a NodeList instance', function() {

    injectHTML([
      '<multi-mount value="1"></multi-mount>',
      '<multi-mount value="2"></multi-mount>',
      '<multi-mount value="3"></multi-mount>',
      '<multi-mount value="4"></multi-mount>'
    ])

    riot.tag('multi-mount', '{ opts.value }')

    var multipleTags = riot.mount(document.querySelectorAll('multi-mount'))

    expect(multipleTags[0].root.innerHTML).to.be.equal('1')
    expect(multipleTags[1].root.innerHTML).to.be.equal('2')
    expect(multipleTags[2].root.innerHTML).to.be.equal('3')
    expect(multipleTags[3].root.innerHTML).to.be.equal('4')

    multipleTags.forEach(tag => tag.unmount())
  })


  it('all the nested tags will are correctly pushed to the parent.tags property', function() {

    injectHTML('<nested-child></nested-child>')

    var tag = riot.mount('nested-child')[0]

    expect(tag.tags.child.length).to.be.equal(6)
    expect(tag.tags['another-nested-child']).to.be.an('object')
    tag.tags.child[0].unmount()
    expect(tag.tags.child.length).to.be.equal(5)
    tag.tags['another-nested-child'].unmount()
    expect(tag.tags['another-nested-child']).to.be.equal(undefined)

    tag.unmount()

  })

  it('brackets', function() {

    injectHTML([
      '<test-a></test-a>',
      '<test-b></test-b>',
      '<test-c></test-c>',
      '<test-d></test-d>',
      '<test-e></test-e>',
      '<test-f></test-f>',
      '<test-g></test-g>'
    ])

    var tag

    riot.settings.brackets = '[ ]'
    riot.tag('test-a', '<p>[ x ]</p>', function() { this.x = 'ok'})
    tag = riot.mount('test-a')[0]
    expect(normalizeHTML(tag.root.innerHTML)).to.be.equal('<p>ok</p>')
    tag.unmount()

    riot.settings.brackets = '${ }'
    riot.tag('test-c', '<p>${ x }</p>', function() { this.x = 'ok' })
    tag = riot.mount('test-c')[0]

    expect(normalizeHTML(tag.root.innerHTML)).to.be.equal('<p>ok</p>')
    tag.unmount()

    riot.settings.brackets = null
    riot.tag('test-d', '<p>{ x }</p>', function() { this.x = 'ok' })
    tag = riot.mount('test-d')[0]

    expect(normalizeHTML(tag.root.innerHTML)).to.be.equal('<p>ok</p>')
    tag.unmount()

    riot.settings.brackets = '[ ]'
    riot.tag('test-e', '<p>[ x ]</p>', function() { this.x = 'ok' })
    tag = riot.mount('test-e')[0]

    expect(normalizeHTML(tag.root.innerHTML)).to.be.equal('<p>ok</p>')
    tag.unmount()

    riot.settings.brackets = '${ }'
    riot.tag('test-f', '<p>${ x }</p>', function() { this.x = 'ok' })
    tag = riot.mount('test-f')[0]

    expect(normalizeHTML(tag.root.innerHTML)).to.be.equal('<p>ok</p>')
    tag.unmount()

    riot.settings.brackets = null
    riot.tag('test-g', '<p>{ x }</p>', function() { this.x = 'ok' })
    tag = riot.mount('test-g')[0]

    expect(normalizeHTML(tag.root.innerHTML)).to.be.equal('<p>ok</p>')
    tag.unmount()

  })

  it('data-is attribute', function() {

    injectHTML('<div id="rtag" data-is="rtag"><\/div>')
    riot.tag('rtag', '<p>val: { opts.val }</p>')

    var tag = riot.mount('#rtag', { val: 10 })[0]
    expect(normalizeHTML(tag.root.innerHTML)).to.be.equal('<p>val: 10</p>')

    tag.unmount()
    expect(document.body.getElementsByTagName('rtag').length).to.be.equal(0)

    tag.unmount()

  })

  it('data-is can be dynamically created by expression', function() {
    injectHTML('<dynamic-data-is></dynamic-data-is>')
    var tag = riot.mount('dynamic-data-is')[0]
    var divs = tag.root.querySelectorAll('div')
    expect(divs[0].querySelector('input').getAttribute('type')).to.be.equal('color')
    expect(divs[1].querySelector('input').getAttribute('type')).to.be.equal('color')
    expect(divs[2].querySelector('input').getAttribute('type')).to.be.equal('date')
    expect(divs[3].querySelector('input').getAttribute('type')).to.be.equal('date')

    tag.single = 'color'
    tag.update()
    expect(divs[3].querySelector('input').getAttribute('type')).to.be.equal('color')

    tag.intags.reverse()
    tag.update()
    divs = tag.root.querySelectorAll('div')
    expect(divs[0].querySelector('input').getAttribute('type')).to.be.equal('date')
    expect(divs[1].querySelector('input').getAttribute('type')).to.be.equal('color')
    expect(divs[2].querySelector('input').getAttribute('type')).to.be.equal('color')

    tag.intags.splice(1, 1)
    tag.update()
    expect(tag.tags.color.length).to.be.equal(2) // single + remaining loop color
    expect(tag.tags.calendar).to.be.an('object')

    // below checks for strays
    tag.intags.reverse()
    tag.update()
    expect(tag.tags.color.length).to.be.equal(2)

    tag.intags.reverse()
    tag.update()
    expect(tag.tags.color.length).to.be.equal(2)

    // single tags as tag object and not array after delete
    tag.intags.splice(1, 1)
    tag.update()
    expect(tag.tags.color).to.be.an('object')

    tag.unmount()

  })

  it('support `data-is` for html5 compliance', function() {
    injectHTML('<div data-is="tag-data-is"></div>')
    var tag = riot.mount('tag-data-is')[0]
    var els = tag.root.getElementsByTagName('p')
    expect(els.length).to.be.equal(2)
    expect(els[0].innerHTML).to.contain('html5')
    expect(els[1].innerHTML).to.contain('too')
    tag.unmount()
  })

  it('tag names are case insensitive (converted to lowercase) in `riot.mount`', function() {
    var i, els = document.querySelectorAll('tag-data-is,[data-is="tag-data-is"]')
    for (i = 0; i < els.length; i++) {
      els[i].parentNode.removeChild(els[i])
    }
    injectHTML('<div data-is="tag-data-is"></div>')
    injectHTML('<tag-DATA-Is></tag-DATA-Is>')
    var tags = riot.mount('tag-Data-Is')

    expect(tags.length).to.be.equal(2)
    expect(tags[0].root.getElementsByTagName('p').length).to.be.equal(2)
    expect(tags[1].root.getElementsByTagName('p').length).to.be.equal(2)
    tags.push(tags[0], tags[1])
  })

  it('the data-is attribute gets updated if a DOM node gets mounted using two or more different tags', function() {

    var div = document.createElement('div')
    var tag1 = riot.mount(div, 'timetable')[0]
    expect(div.getAttribute('data-is')).to.be.equal('timetable')
    var tag2 = riot.mount(div, 'test')[0]
    expect(div.getAttribute('data-is')).to.be.equal('test')

    tag1.unmount()
    tag2.unmount()

  })

  it('the value of the `data-is` attribute needs lowercase names', function() {
    var i, els = document.querySelectorAll('tag-data-is,[data-is="tag-data-is"]')
    for (i = 0; i < els.length; i++) {
      els[i].parentNode.removeChild(els[i])
    }
    injectHTML('<div data-is="tag-DATA-Is"></div>')
    var tags = riot.mount('tag-Data-Is')

    expect(tags.length).to.be.equal(0)
  })

  it('data-is as expression', function() {
    injectHTML('<container-riot></container-riot>')
    var tag = riot.mount('container-riot')[0]
    var div = tag.root.getElementsByTagName('div')[0]
    expect(div.getAttribute('data-is')).to.be.equal('nested-riot')
    tag.unmount()
  })

  it('data-is attribute by tag name', function() {

    // data-is attribute by tag name

    riot.tag('rtag2', '<p>val: { opts.val }</p>')

    injectHTML('<div data-is="rtag2"></div>')

    var tag = riot.mount('rtag2', { val: 10 })[0]
    expect(normalizeHTML(tag.root.innerHTML)).to.be.equal('<p>val: 10</p>')

    tag.unmount()
    expect(document.body.querySelectorAll('rtag2').length).to.be.equal(0)

  })


  it('data-is attribute using the "*" selector', function() {

    injectHTML([
      '<div id="rtag-nested">',
      '  <div data-is="rtag"></div>',
      '  <div data-is="rtag"></div>',
      '  <div data-is="rtag"></div>',
      '</div>'
    ])

    var subTags = riot.mount('#rtag-nested', '*', { val: 10 })

    expect(subTags.length).to.be.equal(3)

    expect(normalizeHTML(subTags[0].root.innerHTML)).to.be.equal('<p>val: 10</p>')
    expect(normalizeHTML(subTags[1].root.innerHTML)).to.be.equal('<p>val: 10</p>')
    expect(normalizeHTML(subTags[2].root.innerHTML)).to.be.equal('<p>val: 10</p>')

    subTags.forEach(tag => tag.unmount())

  })


  it('top level attr manipulation', function() {

    injectHTML('<top-level-attr value="initial"></top-level-attr>')

    riot.tag('top-level-attr', '{opts.value}')

    var tag = riot.mount('top-level-attr')[0]

    tag.root.setAttribute('value', 'changed')
    tag.update()

    expect(tag.root.innerHTML).to.be.equal('changed')

    tag.unmount()
  })

  it('SVGs xlink attributes get correctly parsed', function() {
    injectHTML('<svg-attr></svg-attr>')
    var tag = riot.mount('svg-attr')[0]

    expect(tag.refs.target.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).to.be.equal(tag.href)
    tag.unmount()
  })

  it('preserve attributes from tag definition', function() {


    injectHTML('<preserve-attr></preserve-attr><div data-is="preserve-attr2"></div>')

    var tag = riot.mount('preserve-attr')[0]
    expect(tag.root.className).to.be.equal('single-quote')
    var tag2 = riot.mount('preserve-attr2')[0]
    expect(tag2.root.className).to.be.equal('double-quote')
    tag.unmount()
    tag2.unmount()
  })

  it('precompiled tag compatibility', function() {

    injectHTML('<precompiled></precompiled>')
    riot.tag('precompiled', 'HELLO!', 'precompiled, [data-is="precompiled"]  { color: red }', function(opts) {
      this.nothing = opts.nothing
    })

    var tag = riot.mount('precompiled')[0]
    expect(window.getComputedStyle(tag.root, null).color).to.be.equal('rgb(255, 0, 0)')
    tag.unmount()

  })

  it('static referenced tag for tags property', function() {
    injectHTML('<named-child-parent></named-child-parent>')
    var tag = riot.mount('named-child-parent')[0]
    expect(tag.refs['tags-child'].root.innerHTML).to.be.equal('I have a name')

    tag.unmount()
  })

  it('preserve the mount order, first the parent and then all the children', function() {

    injectHTML('<deferred-mount></deferred-mount>')

    var correctMountingOrder = [
        'deferred-mount',
        'deferred-child-1',
        'deferred-child-2',
        'deferred-loop',
        'deferred-loop',
        'deferred-loop',
        'deferred-loop',
        'deferred-loop'
      ],
      mountingOrder = [],
      cb = function(tagName, childTag) {
        // make sure the mount event gets triggered when all the children tags
        // are in the DOM
        expect(document.contains(childTag.root)).to.be.equal(true)
        mountingOrder.push(tagName)
      },
      tag = riot.mount('deferred-mount', { onmount: cb })[0]

    expect(mountingOrder.join()).to.be.equal(correctMountingOrder.join())

    tag.unmount()
  })

  it('defer unmounting of children', function(done) {

    injectHTML('<deferred-unmount></deferred-unmount>')

    var tag = riot.mount('deferred-unmount')[0]
    expect(tag.beforeUnmountCalled).to.be.equal(false)
    expect(tag.isMounted).to.be.equal(true)
    tag.unmount()

    // should still be mounted
    setTimeout(function() {
      expect(tag.beforeUnmountCalled).to.be.equal(true)
      expect(tag.isMounted).to.be.equal(true)
    }, 1)

    // should be unmounted
    setTimeout(function() {
      expect(tag.beforeUnmountCalled).to.be.equal(true)
      expect(tag.isMounted).to.be.equal(false)
      done()
    }, 20)
  })


  it('no update should be triggered if the preventUpdate flag is set', function() {

    injectHTML('<prevent-update></prevent-update>')

    var tag = riot.mount('prevent-update')[0]

    expect(tag.refs['fancy-name'].innerHTML).to.be.equal('john')

    fireEvent(tag.root.getElementsByTagName('p')[0], 'click')

    expect(tag.refs['fancy-name'].innerHTML).to.be.equal('john')

    tag.unmount()
  })

  it('tag should not unmount if preventDefault flag is set in before-update', function() {

    injectHTML('<prevent-unmount></prevent-unmount>')

    var tag = riot.mount('prevent-unmount')[0]

    expect(tag.refs['fancy-name'].innerHTML).to.be.equal('john')

    tag.unmount()

    expect(tag.isMounted).to.be.equal(true)

    fireEvent(tag.root.getElementsByTagName('p')[0], 'click')

    expect(tag.refs['fancy-name'].innerHTML).to.be.equal('mark')

    tag.unmount()

    expect(tag.isMounted).to.be.equal(false)
  })

  it('the before events get triggered', function() {
    injectHTML('<before-events></before-events>')
    var tag,
      incrementEvents = sinon.spy()

    riot.tag('before-events', '', function() {
      this.on('before-mount', incrementEvents)
      this.on('before-unmount', incrementEvents)
    })
    tag = riot.mount(document.createElement('before-events'))[0]
    tag.unmount()
    expect(incrementEvents).to.have.been.calledTwice
  })

  it('the before mount event gets triggered before the component markup creation', function() {
    injectHTML('<riot-tmp></riot-tmp>')

    riot.tag('riot-tmp', `
      <p>{ flag }<p>
    `, function() {
      this.flag = true
      this.on('before-mount', () => {
        this.flag = false
      })
    })

    var tag = riot.mount('riot-tmp')[0]

    expect($('p', tag.root).innerHTML).to.be.equal('false')

    tag.unmount()
  })

  it('all the events get fired also in the loop tags, the e.item property gets preserved', function() {
    injectHTML('<events></events>')
    var currentItem,
      currentIndex,
      callbackCalls = 0,
      tag = riot.mount('events', {
        cb: function(e) {
          expect(e.item.val).to.be.equal(currentItem)
          expect(e.item.index).to.be.equal(currentIndex)
          callbackCalls++
        }
      })[0],
      divTags = tag.root.getElementsByTagName('div')

    currentItem = tag.items[0]
    currentIndex = 0
    fireEvent(divTags[0], 'click')
    tag.items.reverse()
    tag.update()
    currentItem = tag.items[0]
    currentIndex = 0
    fireEvent(divTags[0], 'click')

    expect(callbackCalls).to.be.equal(2)

    tag.unmount()
  })

  it('event listeners can be switched in runtime without memory leaks', function() {
    injectHTML('<runtime-event-listener-switch></runtime-event-listener-switch>')
    var
      args = [],
      cb = function(name) {
        args.push(name)
      },
      tag = riot.mount('runtime-event-listener-switch', { cb })[0],
      pFirst = $('p.first', tag.root),
      pSecond = $('p.second', tag.root)

    fireEvent(pFirst, 'click')
    expect(args[0]).to.be.equal('ev1')
    fireEvent(pSecond, 'mouseenter')
    expect(args[1]).to.be.equal('ev2')
    fireEvent(pFirst, 'click')
    expect(args[2]).to.be.equal('ev1')
    fireEvent(pFirst, 'mouseenter')
    expect(args[3]).to.be.equal('ev2')

    expect(args.length).to.be.equal(4)

    tag.unmount()

  })

  it('the "updated" event gets properly triggered in a nested child', function(done) {
    injectHTML('<div id="updated-events-tester"></div>')
    var tag = riot.mount('#updated-events-tester', 'named-child-parent')[0],
      counter = 0

    tag.tags['named-child'].on('updated', function() {
      counter ++
      if (counter === 2) done()
    })

    tag.update()
    tag.tags['named-child'].update()

    tag.unmount()

  })

  it('only evalutes expressions once per update', function() {

    injectHTML('<expression-eval-count></expression-eval-count>')

    var tag = riot.mount('expression-eval-count')[0]
    expect(tag.count).to.be.equal(1)
    tag.update()
    expect(tag.count).to.be.equal(2)
    tag.unmount()
  })

  it('multi referenced elements to an array', function() {

    injectHTML('<multi-named></multi-named>')

    var mount = function() {
        var tag = this
        expect(tag.refs.rad[0].value).to.be.equal('1')
        expect(tag.refs.rad[1].value).to.be.equal('2')
        expect(tag.refs.rad[2].value).to.be.equal('3')
        expect(tag.refs.t.value).to.be.equal('1')
        expect(tag.refs.t_1.value).to.be.equal('1')
        expect(tag.refs.t_2.value).to.be.equal('2')
        expect(tag.refs.c[0].value).to.be.equal('1')
        expect(tag.refs.c[1].value).to.be.equal('2')
      },
      mountChild = function() {
        var tag = this
        expect(tag.refs.child.value).to.be.equal('child')
        expect(tag.refs.check[0].value).to.be.equal('one')
        expect(tag.refs.check[1].value).to.be.equal('two')
        expect(tag.refs.check[2].value).to.be.equal('three')

      }
    var tag = riot.mount('multi-named', { mount: mount, mountChild: mountChild })[0]

    tag.unmount()
  })


  it('input type=number', function() {

    injectHTML('<input-number></input-number>')

    var tag = riot.mount('input-number', {num: 123})[0]
    var inp = tag.root.getElementsByTagName('input')[0]
    expect(inp.getAttribute('type')).to.be.equal('number')
    expect(inp.value).to.be.equal('123')

    tag = riot.mount('input-number', {num: 0})[0]
    inp = tag.root.getElementsByTagName('input')[0]
    expect(inp.getAttribute('type')).to.be.equal('number')
    expect(inp.value).to.be.equal('0')

    tag = riot.mount('input-number', {num: null})[0]
    inp = tag.root.getElementsByTagName('input')[0]
    expect(inp.getAttribute('type')).to.be.equal('number')
    expect(inp.value).to.be.equal('')

    tag.unmount()

  })

  it('the input values should be updated corectly on any update call', function() {

    injectHTML('<input-values></input-values>')

    var tag = riot.mount('input-values')[0]
    expect(tag.refs.i.value).to.be.equal('hi')
    tag.update()
    expect(tag.refs.i.value).to.be.equal('foo')

    tag.unmount()
  })

  it('carrot position is preserved when input is same as calculated value', function() {

    injectHTML('<input-values></input-values>')

    var tag = riot.mount('input-values')[0]

    var newValue = 'some new text'
    tag.refs.i.value = newValue
    tag.refs.i.focus()
    setCarrotPos(tag.refs.i, 4)

    tag.message = newValue
    tag.update()

    expect(getCarrotPos(tag.refs.i)).to.be.equal(4)

    tag.unmount()
  })

  it('recursive structure', function() {
    injectHTML('<treeview></treeview>')
    var tag = riot.mount('treeview')[0]
    expect(tag).to.be.an('object')
    expect(tag.isMounted).to.be.equal(true)
    tag.unmount()
  })

  it('top most tag preserve attribute expressions', function() {
    injectHTML('<top-attributes cls="classy"></top-attributes>')
    var tag = riot.mount('top-attributes')[0]
    expect(tag.root.className).to.be.equal('classy') // qouted
    expect(tag.root.getAttribute('data-noquote')).to.be.equal('quotes') // not quoted
    expect(tag.root.getAttribute('data-nqlast')).to.be.equal('quotes') // last attr with no quotes
    expect(tag.root.style.fontSize).to.be.equal('2em') // TODO: how to test riot-prefix?
    tag.unmount()
  })

  it('camelize the options passed via dom attributes', function() {

    injectHTML('<top-attributes></top-attributes>')
    var node = document.createElement('top-attributes'),
      tag

    node.setAttribute('my-random-attribute', 'hello')
    tag = riot.mount(node, {
      'another-random-option': 'hello'
    })[0]
    expect(tag.opts.myRandomAttribute).to.be.equal('hello')
    expect(tag.opts['another-random-option']).to.be.equal('hello')

    tag.unmount()

  })


  it('the "shouldUpdate" locks the tag update properly', function() {
    injectHTML('<should-update></should-update>')
    var tag = riot.mount('should-update')[0]
    tag.update()
    expect(tag.count).to.be.equal(0)
    tag.shouldUpdate = function() { return true }
    tag.update()
    expect(tag.count).to.be.equal(1)
    tag.unmount()
  })

  it('allow passing riot.observale instances to the children tags', function() {
    injectHTML('<observable-attr></observable-attr>')
    var tag = riot.mount('observable-attr')[0]
    expect(tag.tags['observable-attr-child'].wasTriggered).to.be.equal(true)
    tag.unmount()
  })

  it('nested virtual tags unmount properly', function() {
    injectHTML('<virtual-nested-unmount></virtual-nested-unmount>')
    var tag = riot.mount('virtual-nested-unmount')[0]
    var spans = tag.root.querySelectorAll('span')
    var divs = tag.root.querySelectorAll('div')
    expect(spans.length).to.be.equal(6)
    expect(divs.length).to.be.equal(3)
    expect(spans[0].innerHTML).to.be.equal('1')
    expect(spans[1].innerHTML).to.be.equal('1')
    expect(spans[2].innerHTML).to.be.equal('2')
    expect(spans[3].innerHTML).to.be.equal('1')
    expect(spans[4].innerHTML).to.be.equal('2')
    expect(spans[5].innerHTML).to.be.equal('3')
    expect(divs[0].innerHTML).to.be.equal('1')
    expect(divs[1].innerHTML).to.be.equal('2')
    expect(divs[2].innerHTML).to.be.equal('3')

    tag.childItems = [
      {title: '4', childchildItems: ['1', '2', '3', '4']},
      {title: '5', childchildItems: ['1', '2', '3', '4', '5']}
    ]
    tag.update()
    spans = tag.root.querySelectorAll('span')
    divs = tag.root.querySelectorAll('div')
    expect(spans.length).to.be.equal(9)
    expect(divs.length).to.be.equal(2)
    expect(spans[0].innerHTML).to.be.equal('1')
    expect(spans[1].innerHTML).to.be.equal('2')
    expect(spans[2].innerHTML).to.be.equal('3')
    expect(spans[3].innerHTML).to.be.equal('4')
    expect(spans[4].innerHTML).to.be.equal('1')
    expect(spans[5].innerHTML).to.be.equal('2')
    expect(spans[6].innerHTML).to.be.equal('3')
    expect(spans[7].innerHTML).to.be.equal('4')
    expect(spans[8].innerHTML).to.be.equal('5')
    expect(divs[0].innerHTML).to.be.equal('4')
    expect(divs[1].innerHTML).to.be.equal('5')

    tag.unmount()
  })

  it('render tag: input,option,textarea tags having expressions as value', function() {
    injectHTML('<form-controls></form-controls>')
    var val = 'my-value',
      tag = riot.mount('form-controls', { text: val })[0],
      root = tag.root

    expect(root.querySelector('input[type="text"]').value).to.be.equal(val)
    expect(root.querySelector('select option[selected]').value).to.be.equal(val)
    expect(root.querySelector('textarea[name="txta1"]').value).to.be.equal(val)
    expect(root.querySelector('textarea[name="txta2"]').value).to.be.equal('')
    if (IE_VERSION !== 9) expect(root.querySelector('textarea[name="txta2"]').placeholder).to.be.equal(val)

    tag.unmount()
  })


  it('component nested in virtual unmounts correctly', function() {
    injectHTML('<virtual-nested-component></virtual-nested-component>')
    var tag = riot.mount('virtual-nested-component')[0]
    var components = tag.root.querySelectorAll('not-virtual-component2')
    expect(components.length).to.be.equal(4)

    tag.unmount()

    components = tag.root.querySelectorAll('not-virtual-component2')
    expect(components.length).to.be.equal(0)

  })

  it('event handler on each custom tag doesnt update parent', function() {

    injectHTML('<riot-tmp></riot-tmp>')

    riot.tag('inner', '<button ref="btn" onclick="{foo}" />', function() {
      this.foo = function() {}.bind()
    })

    riot.tag('riot-tmp', '<inner each="{item in items}" />', function() {
      this.items = [1]
      this.updateCount = 0
      this.on('update', function() { this.updateCount++ })
    })

    var tag = riot.mount('riot-tmp')[0]

    expect(tag.updateCount).to.be.equal(0)
    fireEvent(tag.tags.inner[0].refs.btn, 'click')
    expect(tag.updateCount).to.be.equal(0)
    tag.unmount()

  })

  it('create tags extending the riot.Tag constructor', function() {
    class Component extends riot.Tag {
      get name() { return 'component' }
      get tmpl() { return '<h1 onclick="{ onClick }">{ opts.message } { user }</h1>' }
      onCreate() {
        this.user = 'dear User'
      }
      onClick() {
        this.user = 'the user is gone'
      }
    }

    var component = new Component(document.createElement('div'), {
      message: 'hello'
    })
    var h1 = $('h1', component.root)

    expect(component.opts.message).to.be.equal('hello')
    expect(component.user).to.be.equal('dear User')
    expect(h1.textContent).to.be.equal('hello dear User')

    fireEvent(h1, 'click')

    expect(h1.textContent).to.be.equal('hello the user is gone')

    // make sure the component is properly registered
    injectHTML('<component></component>')

    var tag = riot.mount('component', {message: 'hi'})[0]
    expect(tag.opts.message).to.be.equal('hi')

    tag.unmount()
    component.unmount()
  })

  it('extend existing tags created via riot.Tag constructor', function() {
    class Component extends riot.Tag {
      get name() { return 'component' }
      get tmpl() { return '<h1 onclick="{ onClick }">{ opts.message } { user }</h1>' }
      onCreate() {
        this.user = 'dear User'
      }
      onClick() {
        this.user = 'the user is gone'
      }
    }

    class SubComponent extends Component {
      get name() { return 'sub-component' }
      get tmpl() { return '<h2 onclick="{ onClick }">{ opts.message } { user }</h2>' }
    }

    var subComponent = new SubComponent(document.createElement('div'), {
      message: 'hello'
    })

    var h2 = $('h2', subComponent.root)

    expect(subComponent.opts.message).to.be.equal('hello')
    expect(subComponent.user).to.be.equal('dear User')
    expect(h2.textContent).to.be.equal('hello dear User')

    // make sure the sub-component is properly registered
    injectHTML('<sub-component></sub-component>')

    var tag = riot.mount('sub-component', {message: 'hi'})[0]
    expect(tag.opts.message).to.be.equal('hi')

    tag.unmount()
    subComponent.unmount()
  })

  it('gets the reference by data-ref attribute', function() {
    injectHTML('<named-data-ref></named-data-ref>')
    var tag = riot.mount('named-data-ref')[0]
    expect(tag.refs.greeting.value).to.be.equal('Hello')

    tag.unmount()
  })

})
