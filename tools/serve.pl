#!/usr/bin/env perl
use strict;
use warnings;
use HTTP::Daemon;
use HTTP::Status;
use File::Spec;

my $root = $ARGV[1] || File::Spec->rel2abs(".");
my $port = $ARGV[0] || 8899;

my %mime = (
  html => 'text/html; charset=utf-8',
  css  => 'text/css',
  js   => 'application/javascript',
  json => 'application/json',
  jpg  => 'image/jpeg',
  jpeg => 'image/jpeg',
  png  => 'image/png',
  webp => 'image/webp',
  svg  => 'image/svg+xml',
  ico  => 'image/x-icon',
);

my $d = HTTP::Daemon->new(LocalAddr => '127.0.0.1', LocalPort => $port, ReuseAddr => 1)
  or die "No pude abrir el puerto $port: $!";
print "Sirviendo $root en ", $d->url, "\n";

while (my $c = $d->accept) {
  # ponytail: una request por conexión, sin keep-alive — evita que el loop
  # single-threaded se cuelgue esperando otra request en una conexión idle.
  if (my $r = $c->get_request) {
    my $path = $r->uri->path;
    $path = "/index.html" if $path eq "/";
    $path =~ s/\.\.//g;
    my $file = File::Spec->catfile($root, split m{/}, $path);
    if (-f $file) {
      my ($ext) = $file =~ /\.([^.]+)$/;
      my $ct = $mime{lc($ext || '')} || 'application/octet-stream';
      open(my $fh, '<:raw', $file) or do { $c->send_error(500); $c->close; next; };
      local $/;
      my $body = <$fh>;
      close $fh;
      my $res = HTTP::Response->new(200, 'OK', ['Content-Type' => $ct, 'Connection' => 'close'], $body);
      $c->send_response($res);
    } else {
      $c->send_error(404);
    }
  }
  $c->close;
  undef($c);
}
