import { DEV, REDIRECT_URI } from '@/src/config';
import { Client } from '@/src/entities/Client';
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoJwtVerifierSingleUserPool } from 'aws-jwt-verify/cognito-verifier';
import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { Module } from '@nestjs/common';
import {
  CognitoAccessTokenPayload,
  CognitoIdTokenPayload,
} from 'aws-jwt-verify/jwt-model';
import { AuthProblem } from '@/src/utils/auth_utils';
import {
  LatestVersion as LatestUserInfoVersion,
  LatestFormat as LatestUserInfoFormat,
} from '@/src/webdata/user_info';
import {
  LatestVersion as LatestAuthTokenVersion,
  LatestFormat as LatestAuthTokenFormat,
  AnyVersion as AnyAuthTokenVersion,
} from '@/src/webdata/auth_token';
import { DeFailure, SerdeT, SerFailure } from '@/src/utils/serde_utils';
import crypto, { randomUUID } from 'node:crypto';
import forge from 'node-forge';

interface AuthTokenPayload {
  // Are we passing an auth code or a refresh token
  grant_type: 'authorization_code';
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  code: string;
}

interface RefreshTokenPayload {
  grant_type: 'refresh_token';
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  refresh_token: string;
}

export interface Tokens {
  access_token: string;
  id_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
}

interface VerifierAccessToken {
  userPoolId: string;
  clientId: string;
  tokenUse: 'access';
}

interface VerifierIdToken {
  userPoolId: string;
  clientId: string;
  tokenUse: 'id';
}

interface RsaKeys {
  public_key: forge.pki.PublicKey;
  private_key: forge.pki.PrivateKey;
}

@Injectable()
export class AuthService {
  public accessVerifier: CognitoJwtVerifierSingleUserPool<VerifierAccessToken>;
  public idVerifier: CognitoJwtVerifierSingleUserPool<VerifierIdToken>;
  private cognitoIp_client: CognitoIdentityProviderClient;
  private logger: Logger = new Logger('Auth');
  private rsa_keys: RsaKeys | null = null;

  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {
    this.accessVerifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      clientId: process.env.COGNITO_CLIENT_ID,
      tokenUse: 'access',
    });

    this.idVerifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      clientId: process.env.COGNITO_CLIENT_ID,
      tokenUse: 'id',
    });

    this.cognitoIp_client = new CognitoIdentityProviderClient({
      useDualstackEndpoint: true,
    });
  }

  async getMyUserInfo(req: Request): Promise<LatestUserInfoFormat | null> {
    const authTkn = await this.getAuthToken(req);

    if (authTkn instanceof AuthProblem) return null;

    const username = authTkn.user?.username;
    const expires = authTkn.expires;
    const client = username
      ? await this.clientRepository.findOneBy({
          user_account: username,
        })
      : null;

    return {
      _version: 4,
      username: username || '',
      created: new Date(),
      expires,
      client: client
        ? {
            id: client.id,
            name: client.name,
          }
        : null,
      is_administrator: authTkn.groups.administrator,
      is_masquerader: authTkn.groups.masquerader,
    };
  }

  verifyAuthToken(token: LatestAuthTokenFormat): boolean {
    const nocheck_tkn: LatestAuthTokenFormat = {
      ...token,
      _check: '',
    };

    const serialized = LatestAuthTokenVersion.ser(nocheck_tkn);
    if (serialized instanceof SerFailure) return false;

    const hash = crypto.hash(
      'sha256',
      `${serialized}${process.env.COGNITO_CLIENT_SECRET}`,
      'hex',
    );

    return hash == token._check;
  }

  async devCreateAuthTokenForClient(
    clientId: number,
  ): Promise<LatestAuthTokenFormat | AuthProblem> {
    const token: LatestAuthTokenFormat = {
      user: null,
      created: new Date(),
      groups: {
        administrator: false,
        masquerader: true,
      },
      expires: new Date(Date.now() + 1000 * 3600 * 1000),
      _check: '',
    };

    if (clientId < 0) {
      // Just make them an administrator
      token.groups.administrator = true;
    } else {
      const client = await this.clientRepository.findOneBy({ id: clientId });
      if (!client) return AuthProblem.cannot_auth_token();

      client.user_account = randomUUID().toString();

      token.user = {
        userid: client.id,
        username: client.user_account,
      };

      await this.clientRepository.save(client);
    }

    const serialized = LatestAuthTokenVersion.ser(token);
    if (serialized instanceof SerFailure) {
      this.logger.log("Somehow didn't serialize");
      return AuthProblem.cannot_auth_token();
    }

    const hash = crypto.hash(
      'sha256',
      `${serialized}${process.env.COGNITO_CLIENT_SECRET}`,
      'hex',
    );

    token._check = hash;

    return token;
  }

  async createAuthToken(
    id: CognitoIdTokenPayload,
  ): Promise<LatestAuthTokenFormat | AuthProblem> {
    this.logger.log(`Cognito username: ${id['cognito:username']}`);
    this.logger.log(`Cognito username: ${id['cognito:username']}`);

    const client = await this.clientRepository.findOneBy({
      user_account: id['cognito:username'],
    });

    const token: LatestAuthTokenFormat = {
      user: client
        ? {
            username: id['cognito:username'],
            userid: client.id,
          }
        : null,
      groups: {
        administrator: id['cognito:groups']?.includes('administrator') || false,
        masquerader: false,
      },
      created: new Date(),
      expires: new Date(id.exp * 1000),
      _check: '',
    };

    const serialized = LatestAuthTokenVersion.ser(token);
    if (serialized instanceof SerFailure) {
      this.logger.log("Somehow didn't serialize");
      return AuthProblem.cannot_auth_token();
    }

    const hash = crypto.hash(
      'sha256',
      `${serialized}${process.env.COGNITO_CLIENT_SECRET}`,
      'hex',
    );

    token._check = hash;

    return token;
  }

  updateAuthToken(
    tkn: SerdeT<typeof AnyAuthTokenVersion>,
  ): LatestAuthTokenFormat | AuthProblem {
    const token: LatestAuthTokenFormat = {
      user: tkn.user,
      groups: {
        administrator: tkn.groups.administrator,
        masquerader:
          // Added in V3
          'masquerader' in tkn.groups ? tkn.groups.masquerader : true,
      },
      created:
        // Added in V2
        'created' in tkn ? tkn.created : new Date(),
      expires: tkn.expires,
      _check: '',
    };

    const serialized = LatestAuthTokenVersion.ser(token);
    if (serialized instanceof SerFailure) {
      this.logger.log("Somehow didn't serialize");
      return AuthProblem.cannot_auth_token();
    }

    const hash = crypto.hash(
      'sha256',
      `${serialized}${process.env.COGNITO_CLIENT_SECRET}`,
      'hex',
    );

    token._check = hash;

    return token;
  }

  async getAuthToken(
    req: Request,
  ): Promise<LatestAuthTokenFormat | AuthProblem> {
    const authtoken = req.cookies['TAUTH'] as string | undefined;

    if (authtoken) {
      // The cookie exists
      const deized = AnyAuthTokenVersion.de(authtoken);
      if (!(deized instanceof DeFailure) && 'created' in deized) {
        const latest_token = this.updateAuthToken(deized);

        // The token deserialized
        if (
          !(latest_token instanceof AuthProblem) &&
          this.verifyAuthToken(latest_token) &&
          deized.expires >= new Date()
        ) {
          // Still signed in, otherwise new token is needed regardless
          return latest_token;
        }
      } else if (deized instanceof DeFailure) {
        // Failed to deserialize
        this.logger.error('Failed to deserialize auth token: ' + deized.reason);
      }
    }

    const id = await this.getUserIdentity(req);
    if (id instanceof AuthProblem) return id;

    return this.createAuthToken(id);
  }

  async getUserIdentity(
    req: Request,
  ): Promise<CognitoIdTokenPayload | AuthProblem> {
    const id = req.cookies['TAUTHI'] as string | undefined;

    if (id) {
      try {
        return await this.idVerifier.verify(id);
      } catch {
        this.logger.error('ID TOKEN EXPIRED');
      }
    }

    const refresh = req.cookies['TAUTHR'] as string | undefined;
    if (refresh) {
      return AuthProblem.tokens_expired();
    } else {
      return AuthProblem.not_signed_in();
    }
  }

  async getUserAccess(
    req: Request,
  ): Promise<CognitoAccessTokenPayload | AuthProblem> {
    const access = req.cookies['TAUTHA'] as string | undefined;

    if (access) {
      try {
        return await this.accessVerifier.verify(access);
      } catch {
        this.logger.error('ACCESS TOKEN EXPIRED');
      }
    }

    const refresh = req.cookies['TAUTHR'] as string | undefined;
    if (refresh) {
      return AuthProblem.tokens_expired();
    } else {
      return AuthProblem.not_signed_in();
    }
  }

  async getTokensFromCode(code: string): Promise<Tokens> {
    const authHeader = btoa(
      `${process.env.COGNITO_CLIENT_ID}:${process.env.COGNITO_CLIENT_SECRET}`,
    );

    const url = new URL('/oauth2/token', process.env.COGNITO_BASE_URI);

    const bodyObj: AuthTokenPayload = {
      grant_type: 'authorization_code',
      client_id: process.env.COGNITO_CLIENT_ID,
      client_secret: process.env.COGNITO_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    };

    const body = Object.entries(bodyObj)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body,
    });

    return (await response.json()) as Tokens;
  }

  async getTokensFromRefreshToken(refresh_token: string): Promise<Tokens> {
    const authHeader = btoa(
      `${process.env.COGNITO_CLIENT_ID}:${process.env.COGNITO_CLIENT_SECRET}`,
    );

    const url = new URL('/oauth2/token', process.env.COGNITO_BASE_URI);

    const bodyObj: RefreshTokenPayload = {
      grant_type: 'refresh_token',
      client_id: process.env.COGNITO_CLIENT_ID,
      client_secret: process.env.COGNITO_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      refresh_token,
    };

    const body = Object.entries(bodyObj)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    const resp = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body,
    });

    return (await resp.json()) as Tokens;
  }

  async verifyAccessToken(access: string): Promise<boolean> {
    try {
      await this.accessVerifier.verify(access);
      return true;
    } catch {
      return false;
    }
  }

  private generateKeys(): RsaKeys {
    if (this.rsa_keys) return this.rsa_keys;

    const md = forge.md.sha256.create();
    md.update(process.env.COGNITO_CLIENT_SECRET);
    const seed = md.digest().toHex();

    const prng = forge.random.createInstance();
    prng.seedFileSync = () => seed;

    const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair({
      bits: 4096,
      prng,
    });

    this.rsa_keys = {
      private_key: privateKey,
      public_key: publicKey,
    };

    return this.rsa_keys;
  }

  getPublicKeyData(): string {
    const { public_key } = this.generateKeys();
    const pem_key = forge.pki.publicKeyToPem(public_key);

    const pem_contents = pem_key
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s+/g, '');

    return pem_contents;
  }

  async createUserForClient(
    client_id: number,
    userEmail: string,
  ): Promise<string | null> {
    const client = await this.clientRepository.findOneBy({ id: client_id });
    if (client == null) {
      return null;
    }

    if (!client.active) {
      this.logger.error('Not active');
      return null;
    }

    if (client.user_account) {
      this.logger.error('Already created: ' + client.user_account);
      return null;
    }

    this.logger.log('Created password and username');

    const temporaryPassword =
      'Pw!' + (Math.random() + 1).toString(36).substring(2);

    const command = new AdminCreateUserCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: userEmail,
      TemporaryPassword: temporaryPassword,
      UserAttributes: [{ Name: 'email', Value: userEmail }],
      DesiredDeliveryMediums: ['EMAIL'],
    });

    this.logger.log('Created account: ' + temporaryPassword);

    try {
      const res = await this.cognitoIp_client.send(command);

      if (res.User) {
        client.user_account = res.User.Username;
        await this.clientRepository.save(client);
        return res.User.Username!;
      } else {
        Logger.log('HUH');
        return null;
      }
    } catch (error) {
      Logger.error(error);
      return null;
    }
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Client])],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthServiceModule {}
