import models from 'models'
import jwt from 'jsonwebtoken'
import ResponseError from 'modules/Response/ResponseError'
import useValidation from 'helpers/useValidation'
import {
  RefreshTokenAttributes,
  verifyRefreshTokenAttributes,
} from 'models/refreshtoken'
import schema from 'controllers/RefreshToken/schema'
import UserService from 'controllers/User/service'
import { verifyRefreshToken } from 'helpers/Token'
import { isObject } from 'lodash'

const { RefreshToken } = models

const { JWT_SECRET_ACCESS_TOKEN }: string | any = process.env

const JWT_ACCESS_TOKEN_EXPIRED = process.env.JWT_ACCESS_TOKEN_EXPIRED || '7d'
const expiredJwt = JWT_ACCESS_TOKEN_EXPIRED.replace(/(d)/g, '') // condition 1d / 7d (day) not include 4m (minutes)

const expiresIn = Number(expiredJwt) * 24 * 60 * 60

class RefreshTokenService {
  /**
   *
   * @param token
   */
  public static async getToken(token: string) {
    const data = await RefreshToken.findOne({
      where: { token },
    })

    if (!data) {
      throw new ResponseError.NotFound('token not found or has been deleted')
    }

    return data
  }

  /**
   *
   * @param formData
   */
  public static async create(formData: RefreshTokenAttributes) {
    const value = useValidation(schema.create, formData)
    const user = await UserService.getOne(formData.UserId)

    if (user) {
      const data = await RefreshToken.create(value)
      return data
    }

    throw new ResponseError.BadRequest('Something went wrong')
  }

  public static async getAccessToken(email: string, refreshToken: string) {
    if (!email || !refreshToken) {
      throw new ResponseError.BadRequest('invalid token')
    }

    const getToken = await this.getToken(refreshToken)
    const verifyToken = verifyRefreshToken(getToken.token)

    if (isObject(verifyToken?.data)) {
      // @ts-ignore
      const decodeToken: verifyRefreshTokenAttributes = verifyToken?.data

      if (email !== decodeToken?.email) {
        throw new ResponseError.BadRequest('email is not valid')
      }

      const payloadToken = {
        id: decodeToken?.id,
        nama: decodeToken?.nama,
        email: decodeToken?.email,
        active: decodeToken?.active,
      }

      // Access Token
      const accessToken = jwt.sign(
        JSON.parse(JSON.stringify(payloadToken)),
        JWT_SECRET_ACCESS_TOKEN,
        {
          expiresIn,
        }
      )

      console.log({ getToken, verifyToken, decodeToken, accessToken })

      return { accessToken, expiresIn }
    }

    // @ts-ignore
    throw new ResponseError.Unauthorized(`${verifyToken?.message}`)
  }
}

export default RefreshTokenService