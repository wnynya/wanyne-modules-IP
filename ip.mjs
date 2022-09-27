const regex4 = new RegExp(
  /^((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])/
);
const regex6 = new RegExp(
  /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/
);

class IP {
  constructor(ip) {
    if (!regex4.test(ip) && !regex6.test(ip)) {
      throw new Error('Not vaild ip address');
    }
    this.ip = ip;
    this.is4 = regex4.test(this.ip);
    this.is6 = !this.is4;
    this.hasSubnet = !!this.ip.match(/\/[0-9]+/);
    this.full6 = this.getFull6(this.ip);
    if (this.hasSubnet) {
      this.range = this.is4 ? this.getRange4() : this.getRange6();
    }
  }

  getFull6() {
    let ips = this.ip;
    if (this.hasSubnet) {
      ips = ips.replace(/\/[0-9]+/, '');
    }
    if (this.is4) {
      const m = ips.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)/);
      const a = [
        (m[1] * 1).toString(16),
        (m[2] * 1).toString(16),
        (m[3] * 1).toString(16),
        (m[4] * 1).toString(16),
      ];
      return (
        '0000:0000:0000:0000:0000:ffff:' +
        (a[0].length < 2 ? '0' + a[0] : a[0]) +
        (a[1].length < 2 ? '0' + a[1] : a[1]) +
        ':' +
        (a[2].length < 2 ? '0' + a[2] : a[2]) +
        (a[3].length < 2 ? '0' + a[3] : a[3])
      );
    } else {
      ips = ips.replace(/^:|:$/g, '');
      let ipv6 = ips.split(':');
      for (let i = 0; i < ipv6.length; i++) {
        let hex = ipv6[i];
        if (hex != '') {
          ipv6[i] = ('0000' + hex).substr(-4);
        } else {
          hex = [];
          for (let j = ipv6.length; j <= 8; j++) {
            hex.push('0000');
          }
          ipv6[i] = hex.join(':');
        }
      }
      return ipv6.join(':');
    }
  }

  getRange4() {
    var part = this.ip.split('/');
    var ipas = part[0].split('.');
    var blocks = ['0', '0', '0', '0'];
    if (!/\d+\.\d+\.\d+\.\d+/.test(part[1])) {
      blocks = (
        '1'.repeat(parseInt(part[1], 10)) +
        '0'.repeat(32 - parseInt(part[1], 10))
      ).match(/.{1,8}/g);
      blocks = blocks.map(function (el) {
        return parseInt(el, 2);
      });
    } else {
      blocks = part[1].split('.').map(function (el) {
        return parseInt(el, 10);
      });
    }
    var ivrt = blocks.map(function (el) {
      return el ^ 255;
    });
    var base = ipas.map(function (block, idx) {
      return block & blocks[idx];
    });
    var brdc = base.map(function (block, idx) {
      return block | ivrt[idx];
    });
    return {
      start: base.join('.'),
      end: brdc.join('.'),
    };
  }

  getRange6() {
    const m = this.ip.match(/\/([0-9]+)/);
    const mask = m[1] * 1;
    const ba = a2b(this.full6);
    const bn = ba.substr(0, mask);
    const bh = '0'.repeat(0);
    const bs = bn + '0'.repeat(128 - mask) + bh;
    const be = bn + '1'.repeat(128 - mask) + bh;
    function l(d, p, n) {
      const pp = p.repeat(n);
      if (d.length < pp.length) {
        d = pp.substring(0, pp.length - d.length) + d;
      }
      return d;
    }
    function a2b(a) {
      let b = '';
      for (const s of new IP(a).full6.split(':')) {
        b += l(parseInt(s, 16).toString(2), '0', 16);
      }
      return b;
    }
    function b2a(b) {
      const a = [];
      for (let i = 0; i < 8; ++i) {
        const bp = b.substr(i * 16, 16);
        const s = l(parseInt(bp, 2).toString(16), '0', 4);
        a.push(s);
      }
      return a.join(':');
    }
    return {
      start: b2a(bs),
      end: b2a(be),
    };
  }

  in(ip, ip2) {
    if (!ip2 && !ip.hasSubnet) {
      return this.full6 == ip.full6;
    }
    let start, end;
    if (!ip2 && ip.hasSubnet) {
      const range = ip.range;
      start = new IP(range.start).full6;
      end = new IP(range.end).full6;
    } else {
      start = ip.full6;
      end = ip2.full6;
    }
    start = start.replace(/:/g, '');
    end = end.replace(/:/g, '');
    const c = this.full6.replace(/:/g, '');
    return start <= c && c <= end;
  }

  isBogon() {
    for (const sub in bogonIPRanges) {
      const ip = new IP(sub);
      if (this.in(ip)) {
        return true;
      }
    }
    return false;
  }

  getBogon() {
    for (const sub in bogonIPRanges) {
      const ip = new IP(sub);
      if (this.in(ip)) {
        return bogonIPRanges[sub];
      }
    }
    return null;
  }
}

const bogonIPRanges = {
  '0.0.0.0/8': 'Wildcard',
  '10.0.0.0/8': 'Local',
  '100.64.0.0/10': 'Local',
  '127.0.0.0/8': 'Loopback',
  '169.254.0.0/16': 'Special Use',
  '172.16.0.0/12': 'Local',
  '192.0.0.0/24': 'IETF Protocol',
  '192.0.2.0/24': 'TEST-NET-2',
  '192.168.0.0/16': 'Local',
  '198.18.0.0/15': 'Internal',
  '198.51.100.0/24': 'TEST-NET-2',
  '203.0.113.0/24': 'TEST-NET-3',
  '224.0.0.0/4': 'Multicast',
  '240.0.0.0/4': 'Reserved',
  '255.255.255.255/32': 'Broadcast',
  '100::/64': 'Remotely triggered black hole addresses',
  '2001:10::/28': 'Overlay routable cryptographic hash identifiers (ORCHID)',
  '2001:db8::/32': 'Documentation prefix',
  'fc00::/7': 'Unique local addresses (ULA)',
  'fe80::/10': 'Link-local unicast',
  'fec0::/10': 'Site-local unicast',
  'ff00::/8': 'Multicast',
  '2002::/24': '6to4 bogon (0.0.0.0/8)',
  '2002:a00::/24': '6to4 bogon (10.0.0.0/8)',
  '2002:7f00::/24': '6to4 bogon (127.0.0.0/8)',
  '2002:a9fe::/32': '6to4 bogon (169.254.0.0/16)',
  '2002:ac10::/28': '6to4 bogon (172.16.0.0/12)',
  '2002:c000::/40': '6to4 bogon (192.0.0.0/24)',
  '2002:c000:200::/40': '6to4 bogon (192.0.2.0/24)',
  '2002:c0a8::/32': '6to4 bogon (192.168.0.0/16)',
  '2002:c612::/31': '6to4 bogon (198.18.0.0/15)',
  '2002:c633:6400::/40': '6to4 bogon (198.51.100.0/24)',
  '2002:cb00:7100::/40': '6to4 bogon (203.0.113.0/24)',
  '2002:e000::/20': '6to4 bogon (224.0.0.0/4)',
  '2002:f000::/20': '6to4 bogon (240.0.0.0/4)',
  '2002:ffff:ffff::/48': '6to4 bogon (255.255.255.255/32)',
  '2001::/40': 'Teredo bogon (0.0.0.0/8)',
  '2001:0:a00::/40': 'Teredo bogon (10.0.0.0/8)',
  '2001:0:7f00::/40': 'Teredo bogon (127.0.0.0/8)',
  '2001:0:a9fe::/48': 'Teredo bogon (169.254.0.0/16)',
  '2001:0:ac10::/44': 'Teredo bogon (172.16.0.0/12)',
  '2001:0:c000::/56': 'Teredo bogon (192.0.0.0/24)',
  '2001:0:c000:200::/56': 'Teredo bogon (192.0.2.0/24)',
  '2001:0:c0a8::/48': 'Teredo bogon (192.168.0.0/16)',
  '2001:0:c612::/47': 'Teredo bogon (198.18.0.0/15)',
  '2001:0:c633:6400::/56': 'Teredo bogon (198.51.100.0/24)',
  '2001:0:cb00:7100::/56': 'Teredo bogon (203.0.113.0/24)',
  '2001:0:e000::/36': 'Teredo bogon (224.0.0.0/4)',
  '2001:0:f000::/36': 'Teredo bogon (240.0.0.0/4)',
  '2001:0:ffff:ffff::/64': 'Teredo bogon (255.255.255.255/32)',
};

export default IP;
