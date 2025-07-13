# Digital Signatures with `openssl`

The `openssl` command line tool is a Swiss Army knife for all sorts of
cryptographic operations. Let's see how we can use `openssl` to generate and
verify digital signatures for software artifacts.

## Algorithms

When it comes to public key cryptography there are many different, standard
algorithms available -- RSA and ECDSA being two which are in common use today.
We'll focus on ECDSA (Elliptic Curve Digital Signature Algorithm) as its
generally considered to be more performant -- offering a higher level of
security with smaller key sizes.

Within ECDSA there are different curves which can be chosen with different
security/performance characteristics. To see all of the curves supported by
`openssl` run the following:

```bash
openssl ecparam -list_curves
```

You should see a long list of curves, but we're going to focus on a single one:
"prime256v1". This curve uses a 256-bit key size and it widely supported across
a number of tools/languages.

## Create a Key

We can use the `openssl` command to generate a random private key using ECDSA
P-256 curve:

```bash
openssl ecparam -name prime256v1 -genkey > ec-private.pem
```

Let's break this down:

- `ecparam` is a sub-command available in `openssl` which allows you to interact
  with the different EC curves
- `-name prime256v1` identifies the specific curve we want to use -- P256 in
  this case
- `-genkey` tells it to generate a new key -- actually a public/private key pair
- `> ec-private.pem` sends the generated key to a file named "ec-private.pem" in
  the current directory

Take a look at the generated key

```bash
cat ec-private.pem
```

You should see something like the follwoing:

```
-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIKqKd1JqJ0L8mwQsEXqZMSas9MGqIiSEmLktE7tjDZXVoAoGCCqGSM49
AwEHoUQDQgAERmB/I+snr32mzCjQd6PnCy5kv3bPaRmlfjbZZl2SFH8fpybhi6De
HNLp0QQZW3ovd7xeRtrPusPiTEiCMCpP8A==
-----END EC PRIVATE KEY-----
```

The is a [PEM](https://en.wikipedia.org/wiki/Privacy-Enhanced_Mail) file with
the key information encoded as a [Base64](https://en.wikipedia.org/wiki/Base64)
encoded string. PEM files can be easily identified by the header and footer
lines with the "BEGIN"/"END" strings identifying the type of the encoded
message. In our case, the message type is "EC PRIVATE KEY".

We can use `openssl` to decode the data in the PEM file:

```bash
openssl ec -in ec-private.pem -text -noout
```

Again, let's break down the parts of this command:

- `ec` is another `openssl` subcommand -- this one specifically for manipulating
  EC keys
- `-in ec-private.pem` instructs the command to read the key from our PEM file
- `-text` prints the public/private parts of the kye
- `-noout` suppresses the output of the raw PEM file

The output will look something like the following:

```
read EC key
Private-Key: (256 bit)
priv:
    00:aa:8a:77:52:6a:27:42:fc:9b:04:2c:11:7a:99:
    31:26:ac:f4:c1:aa:22:24:84:98:b9:2d:13:bb:63:
    0d:95:d5
pub:
    04:46:60:7f:23:eb:27:af:7d:a6:cc:28:d0:77:a3:
    e7:0b:2e:64:bf:76:cf:69:19:a5:7e:36:d9:66:5d:
    92:14:7f:1f:a7:26:e1:8b:a0:de:1c:d2:e9:d1:04:
    19:5b:7a:2f:77:bc:5e:46:da:cf:ba:c3:e2:4c:48:
    82:30:2a:4f:f0
ASN1 OID: prime256v1
NIST CURVE: P-256
```

Among the data displayed is the size of the private key (256 bits), the curve
for which the key was generated (P-256) and the raw values for the private and
public keys. The two key values are simply REALLY big numbers shown as
hex-encoded values.

You never want to share your private key so let's extract the public portion of
our key from the PEM file and store it separately:

```bash
openssl ec -in ec-private.pem -pubout > ec-public.pem
```

The `-pubout` flag simply instructs `openssl` to extract the public key which is
then sent to a new file named "ec-public.pem". The new file is another PEM file,
but one which contains JUST the public key this time:

```
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAERmB/I+snr32mzCjQd6PnCy5kv3bP
aRmlfjbZZl2SFH8fpybhi6DeHNLp0QQZW3ovd7xeRtrPusPiTEiCMCpP8A==
-----END PUBLIC KEY-----
```

## Signing

Let's user our private key to generate a signature! First, we'll need something
to sign -- use the following command to generate a new text file:

```
echo "super important result: 42" > artifact.txt
```

This simply writes a string to a new file named "artifact.txt". We'll generate a
signature for this file so that anyone with our public key can verify that it
has not been tampered with.

To generate a signature we'll supply both our private key and the artifact we
want to sign to `openssl`:

```
openssl dgst -sha256 -sign ec-private.pem artifact.txt > artifact.sig
```

- `dgst` is another subcommand of `openssl` -- this one deals with all things
  related to digest (or hash) calculation for files. When generating a signature
  we actually calculate the signature over the digest of the artifact instead of
  the bytes of the artifact itself (largely for performance reasons).
- `-sha256` identifies the digest algorithm to be applied to the artifact --
  SHA256 in this case
- `ec-private.pem` is the name of the file containing our private key
- `artifact.txt` is the file for which we want to generate a signature
- `> artifact.sig` writes the generated signature to a new file named
  "artifact.sig"

The generated signature is stored in raw binary form so looking at the content
of the "artifact.sig" file directly isn't going to be particularly enlightening.
However, there's another `openssl` command we can use to peak at the signature:

```bash
openssl asn1parse -in artifact.sig -inform der
```

- `asn1parse` is yet another `openssl` command that can parse the specific data
  structure used to represent the signature
- `-in artifact.sig` identifies the signature file
- `-inform der` identifies the specific encoding used to represent the signature
  -- [DER](https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/)

You should see something like this as a result:

```
    0:d=0  hl=2 l=  70 cons: SEQUENCE
    2:d=1  hl=2 l=  33 prim: INTEGER           :C98380EB937CE709F09CADA7E989D70052431D10D4FEFBD22FDD627DD4EA8F40
   37:d=1  hl=2 l=  33 prim: INTEGER           :B72F937EEDAEA2A98410EA78446C211C197BACE07B6A4878FB30ECC850B4B9E5
```

There's a bunch of extraneous info here we won't get into, but the important
part is that the signature is fundamentally just a pair of (big) integers that
represent a specific point on the P256 elliptic curve.

## Verification

Now that we've generated a signature for our artifact let's try verifying that
signature. To do this, we'll use the `openssl dgst` command again:

```
openssl dgst -sha256 -verify ec-public.pem -signature artifact.sig artifact.txt
```

- `dgst` the same subcommand we used to generate the signature
- `-sha256` the digest algorithm (SHA256) -- this must match the algorithm used
  to generate the signature
- `-verify ec-public.pem` verify the signature using the specified public key
- `-signature artifact.sig` identifies the signature to be verified
- `artifact.xt` the artifact whose signature we're verifying

You should be greeted with a message like the following:

```
Verified OK
```

We have just proven a couple things about the "artifact.txt" file:

- The file has not been altered or tampered with since the point at which the
  signature was generated
- The signature was created by the owner of this particular public key (that is,
  it was generated using the private portion of this key pair)

Let's alter the artifact and see what happens when we try to verify the
signature again. Use the following command to edit the artifact:

```
echo "virus" >> artifact.txt
```

Here we're using the `>>` append operator to write the word "virus" to the end
of the existing "artifact.txt" file.

If we re-run the verification command we should see a different result this
time:

```
Error Verifying Data
```

Since we've tampered with the artifact, our signature no longer matches!

## Certificates

As noted above, the verification of the artifact signature is proof that the
signature was generated by the owner of the private portion of the keypair we're
using to perform the verification.

If I were to personally deliver to you my public key, you would probably have
pretty high confidence that it was **my** key and, therefore, would feel good
that any signatures you verify with that key would have originated from me.

However, if you haven't received that key directly from me (say you downloaded
it from a website), there is no information available which identifies who that
key belongs to.

<!-- prettier-ignore-start -->
> [!IMPORTANT] 
Signature verification serves no purpose unless you trust the entity doing the signing.
<!-- prettier-ignore-end -->

Ideally, there would be some reliable way to associate a particular key with
some user (or system) so that you could have better confidence in the origin of
the signature you're verifying.

This is exactly the problem that certificates were created to solve. A
certificate takes a public key and binds it to some identity. Instead of passing
around raw keys, it's far more common to distribute a cryptographic certificate
which contains both the public key and the identity of the owning entity.

Let's look at certificate by generating one for our keypair. Our trusty
`openssl` has us covered once again:

```
openssl req -new -x509 -key ./ec-private.pem -days 365 -out signing.crt
```

- `req` is an `openssl` subcommand that deals exclusively with
  requesting/generating certificates
- `-new` we're asking for a new certificate to be created
- `-x509` identifies that we want a certificate conforming to the
  [x509](https://en.wikipedia.org/wiki/X.509) standard
- `-key ec-private.pem` identifies the key we want embedded in the certificate
  -- note that you MUST provide your private key to generate the certificate,
  but **only** the public key will be embeded in the cert.
- `-days 365` all certificates have a validity period marked by a start and end
  date -- in this case we're asking for a certificate which is valid for 365
  days staring from now.
- `-out signing.crt` write the resulting certificate to a file named
  "signing.crt"

You'll be prompted to enter a bunch of identifying information. Feel free to
skip all but the "Common Name" prompt where you'll enter your name.

Let's dump the content of the certificate we just generated and see what we got:

```
cat signing.crt
```

You should see something like the following:

```
-----BEGIN CERTIFICATE-----
MIIBvzCCAWYCCQDEjsg7NmWB/TAKBggqhkjOPQQDAjBoMQswCQYDVQQGEwJVUzEL
MAkGA1UECAwCQ0ExEjAQBgNVBAcMCVNhbiBEaWVnbzEWMBQGA1UEAwwNQnJpYW4g
RGVIYW1lcjEgMB4GCSqGSIb3DQEJARYRYnJpYW5AZGVoYW1lci5jb20wHhcNMjUw
NzEzMTgyNzUzWhcNMjYwNzEzMTgyNzUzWjBoMQswCQYDVQQGEwJVUzELMAkGA1UE
CAwCQ0ExEjAQBgNVBAcMCVNhbiBEaWVnbzEWMBQGA1UEAwwNQnJpYW4gRGVIYW1l
cjEgMB4GCSqGSIb3DQEJARYRYnJpYW5AZGVoYW1lci5jb20wWTATBgcqhkjOPQIB
BggqhkjOPQMBBwNCAARGYH8j6yevfabMKNB3o+cLLmS/ds9pGaV+NtlmXZIUfx+n
JuGLoN4c0unRBBlbei93vF5G2s+6w+JMSIIwKk/wMAoGCCqGSM49BAMCA0cAMEQC
IB9oIrOs2JmUB8WV93P51tiUPHchNfOU5v2z1FJ5DuTsAiBZhLBJ0EyZH3dhRXq+
KZvp4gVFEA85JSKGZ/muzAjubA==
-----END CERTIFICATE-----
```

At this point, you should recognize this as being a PEM file with the
certificate represnted as a Base64-encoded string.

Let's decode the cert and see what we got:

```
openssl x509 -in signing.crt -text -noout
```

- `x509` yet another `openssl` subcommand -- this one deals with x509
  certificates
- `-in signing.crt` the certificate file we want to read
- `-text` asks openssl to decode the certificate and output a text
  representation of the embedded data
- `-noout` suppresses the output for the certificate PEM file again

The result will be something like the following:

```
Certificate:
    Data:
        Version: 1 (0x0)
        Serial Number:
            b1:63:d8:e2:5e:cf:d6:b1
    Signature Algorithm: ecdsa-with-SHA256
        Issuer: CN=John Doe
        Validity
            Not Before: Jul 13 18:31:35 2025 GMT
            Not After : Jul 13 18:31:35 2026 GMT
        Subject: CN=John Doe
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (256 bit)
                pub:
                    04:46:60:7f:23:eb:27:af:7d:a6:cc:28:d0:77:a3:
                    e7:0b:2e:64:bf:76:cf:69:19:a5:7e:36:d9:66:5d:
                    92:14:7f:1f:a7:26:e1:8b:a0:de:1c:d2:e9:d1:04:
                    19:5b:7a:2f:77:bc:5e:46:da:cf:ba:c3:e2:4c:48:
                    82:30:2a:4f:f0
                ASN1 OID: prime256v1
                NIST CURVE: P-256
    Signature Algorithm: ecdsa-with-SHA256
         30:46:02:21:00:e5:09:00:96:69:28:c9:6b:4b:9e:46:cb:04:
         83:0c:22:58:19:e4:a6:4e:13:63:5e:72:06:2b:a2:f1:6c:40:
         e9:02:21:00:c8:69:7c:51:a3:11:9c:48:d8:89:49:ff:d3:05:
         07:13:42:28:32:32:07:e9:43:ed:65:04:1e:f6:65:31:7e:45
```

Among the data you'll see here:

- The start and end dates for the certificates validity period
- The "Subject" (or owner) of the certificate which should match the info you
  entered when the certificate was generated
- The public key from your keypair -- the hex-encoded value here should match
  the string we saw when we dumped the content of the key [above](#create-a-key)

Note that the certificate also has a signature attached to it (that last block
you see in the output above). Normally, you would request a certificate like
this from some sort of Certificate Authority who would issue ther cert and then
sign it with their private key. This allows anyone using this certificate to
verify that it was issued from some trusted authority.

In our case, we've created a self-signed certificate -- we used our own private
key to sign the certificate. We're vouching for ourselves. Obviously, this
doesn't carry with it the same sort of security guarantees that a certificate
issued from a Certificate Authority would. We're again trusting the keyholder to
truthfully identify themselves.

Now that we have a certificate asserting our identity, there's no need to pass
around the raw public key. It's far more common to find public keys distributed
as part of a certificate.

Many tools/libraries will allow you to verify signatures simply by providing a
certificate. Unfortunately, `openssl` doesn't allow for this. In order to verify
a signature using a certificate, you need to run a command to first extract the
public key from the cert:

```
openssl x509 -in signing.crt -pubkey -noout
```

- `x509` use the subcommand for working with x509 certificates
- `-in signing.crt` the certificate file we want to read
- `-pubkey` asks openssl to extract the public key from the certificate
- `-noout` suppresses the output for the certificate PEM file again

Note that the PEM-formatted key that is output should be identical to the one we
extracted from the private key originally.

From here, the process of verifying the signature is identical to what we did in
the [previous section](#verification).
