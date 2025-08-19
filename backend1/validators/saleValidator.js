import Joi from 'joi'

const saleProductSchema = Joi.object({
  productId: Joi.number().required(),
  name: Joi.string().required(),
  quantity: Joi.number().min(1).required(),
  price: Joi.number().min(0).required()
})

const saleSchema = Joi.object({
  products: Joi.array().items(saleProductSchema).min(1).required(),
  status: Joi.string().valid('pending', 'completed', 'cancelled').optional(),
  notes: Joi.string().max(500).optional()
})

export const validateSale = (req, res, next) => {
  const { error } = saleSchema.validate(req.body)
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      error: error.details[0].message
    })
  }
  next()
}