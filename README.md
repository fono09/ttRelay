## Installation
```
git clone https://github.com/fono09/ttRelay
cd ttRelay
npm
```
## Getting Started

1. Make 'config/default.json' file.
2. Edit it like below.

```
{
  "target_acct": "fono (Your screen name in the mastodon instance)",
  "redis_prefix": "hoge (Redis Prefix. anything)",
  "instance_domain": "ma.fono.jp (Your mastodon instance domain)",
  "mastodon_access_token": "1234afaf78191deea2a1b (Your token in mastodon(See below))",
  "consumer_key": "Q4VJIQofa13 (Your Twitter app's Consumer key)",
  "consumer_secret": "Ppc9feafjaq329u492aafa32 (Your Twitter app's Consumer secret)",
  "access_token_key": "1234657-f3I9104JJAKi (Your Twitter app's your access token key)",
  "access_token_secret": "FSAJ912FAaaSnhd (Your Twitter app's your access token secret)"
}
``` 

The easiest way to get mastodon token: https://takahashim.github.io/mastodon-access-token/

Create your Twitter app : https://developer.twitter.com/

3. run `docker-compose up`