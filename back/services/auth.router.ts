import { Router } from 'express'
import {
    googleLogin,
    googleCallback,
    me,
    refreshToken,
    logout,

} from '../controllers/auth.controller'
import { jwtMiddleware } from '../middleware/jwt'

const router: Router = Router()


router.get('/google', googleLogin)
router.post('/refresh', refreshToken)
router.post('/logout', logout)
router.get('/google/callback', googleCallback)
router.get('/me', jwtMiddleware, me)

export default router